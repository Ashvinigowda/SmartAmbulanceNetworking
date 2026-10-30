/*
 * Smart Ambulance Networking Simulation using NS-3.45
 *
 * Performance Analysis and Visualization of Priority-Based Emergency
 * Communication Under Network Congestion.
 *
 * Implements:
 * - Structured application messages: AMBULANCE_TELEMETRY, EMERGENCY_ALERT,
 *   HOSPITAL_PREALERT, and ORDINARY_TELEMETRY across 4 traffic categories.
 * - Dynamic position, speed, and ETA extraction from node mobility.
 * - Configurable mobility: Static baseline, RandomWaypoint, RandomWalk2d.
 * - Configurable ordinary traffic sources: 10, 25, 50, 75, 100, 150.
 * - Multiple moving ambulances (1 to 5+) with independent streams.
 * - Multiple receivers (Hospital A, Hospital B, Central Dispatch).
 * - Verified IEEE 802.11 QoS (EDCA) priority at Socket & MAC layers (AC_VO, AC_VI, AC_BE).
 * - Configurable propagation-loss models: LogDistance, Friis, Nakagami fading.
 * - Configurable PHY modes, data rates, and transmit power.
 * - Receiver-side parsing, validation, sequence tracking, and latency computation.
 * - FlowMonitor metrics and optional NetAnim trace generation.
 */

#include "ns3/core-module.h"
#include "ns3/network-module.h"
#include "ns3/internet-module.h"
#include "ns3/wifi-module.h"
#include "ns3/mobility-module.h"
#include "ns3/applications-module.h"
#include "ns3/flow-monitor-module.h"
#include "ns3/netanim-module.h"
#include "ns3/propagation-module.h"

#include <iostream>
#include <iomanip>
#include <fstream>
#include <string>
#include <vector>
#include <map>
#include <cmath>
#include <cstring>
#include <memory>

using namespace ns3;

NS_LOG_COMPONENT_DEFINE("SmartAmbulanceSimulation");

// ===========================================================================
// Application-Layer Message Definitions and NS-3 Custom Header
// ===========================================================================

enum AmbulanceMessageType : uint8_t
{
    MSG_AMBULANCE_TELEMETRY = 1,
    MSG_EMERGENCY_ALERT     = 2,
    MSG_HOSPITAL_PREALERT   = 3,
    MSG_ORDINARY_TELEMETRY  = 4
};

enum OrdinaryTrafficCategory : uint16_t
{
    CAT_ENVIRONMENTAL_TELEMETRY = 1,
    CAT_TRAFFIC_DENSITY_SUMMARY  = 2,
    CAT_INFRASTRUCTURE_STATUS    = 3,
    CAT_VEHICLE_OPERATIONAL      = 4
};

/*
 * Custom binary header for all simulation packets.
 * Compact 50-byte serialized header with network byte-order encoding.
 */
class AmbulanceAppHeader : public Header
{
public:
    static const uint16_t MAGIC = 0x414D; // 'AM'
    static const uint8_t  VERSION = 1;

    AmbulanceAppHeader()
        : m_magic(MAGIC),
          m_version(VERSION),
          m_msgType(MSG_AMBULANCE_TELEMETRY),
          m_sourceNodeId(0),
          m_destNodeId(0),
          m_ambulanceId(0),
          m_seq(0),
          m_txTimestampNs(0),
          m_posX(0.0f),
          m_posY(0.0f),
          m_speed(0.0f),
          m_heading(0.0f),
          m_eventOrCategory(0),
          m_statusOrSeverity(0),
          m_targetHospitalId(0),
          m_etaSeconds(0.0f),
          m_requiredResources(0),
          m_payloadLen(0)
    {
    }

    virtual ~AmbulanceAppHeader() override {}

    static TypeId GetTypeId(void)
    {
        static TypeId tid = TypeId("ns3::AmbulanceAppHeader")
            .SetParent<Header>()
            .SetGroupName("Applications")
            .AddConstructor<AmbulanceAppHeader>();
        return tid;
    }

    virtual TypeId GetInstanceTypeId(void) const override { return GetTypeId(); }

    virtual uint32_t GetSerializedSize(void) const override
    {
        // 2 + 1 + 1 + 4 + 4 + 2 + 4 + 8 + 4 + 4 + 4 + 4 + 2 + 1 + 1 + 4 + 2 + 2 = 54 bytes
        return 54;
    }

    virtual void Serialize(Buffer::Iterator start) const override
    {
        start.WriteHtonU16(m_magic);
        start.WriteU8(m_version);
        start.WriteU8(m_msgType);
        start.WriteHtonU32(m_sourceNodeId);
        start.WriteHtonU32(m_destNodeId);
        start.WriteHtonU16(m_ambulanceId);
        start.WriteHtonU32(m_seq);
        start.WriteHtonU64(m_txTimestampNs);
        WriteFloat(start, m_posX);
        WriteFloat(start, m_posY);
        WriteFloat(start, m_speed);
        WriteFloat(start, m_heading);
        start.WriteHtonU16(m_eventOrCategory);
        start.WriteU8(m_statusOrSeverity);
        start.WriteU8(m_targetHospitalId);
        WriteFloat(start, m_etaSeconds);
        start.WriteHtonU16(m_requiredResources);
        start.WriteHtonU16(m_payloadLen);
    }

    virtual uint32_t Deserialize(Buffer::Iterator start) override
    {
        m_magic = start.ReadNtohU16();
        m_version = start.ReadU8();
        m_msgType = start.ReadU8();
        m_sourceNodeId = start.ReadNtohU32();
        m_destNodeId = start.ReadNtohU32();
        m_ambulanceId = start.ReadNtohU16();
        m_seq = start.ReadNtohU32();
        m_txTimestampNs = start.ReadNtohU64();
        m_posX = ReadFloat(start);
        m_posY = ReadFloat(start);
        m_speed = ReadFloat(start);
        m_heading = ReadFloat(start);
        m_eventOrCategory = start.ReadNtohU16();
        m_statusOrSeverity = start.ReadU8();
        m_targetHospitalId = start.ReadU8();
        m_etaSeconds = ReadFloat(start);
        m_requiredResources = start.ReadNtohU16();
        m_payloadLen = start.ReadNtohU16();
        return GetSerializedSize();
    }

    virtual void Print(std::ostream &os) const override
    {
        os << "[AmbulanceAppHeader v=" << (uint32_t)m_version
           << " type=" << (uint32_t)m_msgType
           << " ambId=" << m_ambulanceId
           << " src=" << m_sourceNodeId
           << " dst=" << m_destNodeId
           << " seq=" << m_seq
           << " pos=(" << m_posX << "," << m_posY << ")"
           << " spd=" << m_speed
           << " eta=" << m_etaSeconds << "s]";
    }

    // Setters
    void SetMsgType(uint8_t t) { m_msgType = t; }
    void SetSourceNodeId(uint32_t s) { m_sourceNodeId = s; }
    void SetDestNodeId(uint32_t d) { m_destNodeId = d; }
    void SetAmbulanceId(uint16_t a) { m_ambulanceId = a; }
    void SetSeq(uint32_t s) { m_seq = s; }
    void SetTxTimestampNs(uint64_t t) { m_txTimestampNs = t; }
    void SetPosition(float x, float y) { m_posX = x; m_posY = y; }
    void SetSpeed(float spd) { m_speed = spd; }
    void SetHeading(float h) { m_heading = h; }
    void SetEventOrCategory(uint16_t c) { m_eventOrCategory = c; }
    void SetStatusOrSeverity(uint8_t s) { m_statusOrSeverity = s; }
    void SetTargetHospitalId(uint8_t h) { m_targetHospitalId = h; }
    void SetEtaSeconds(float eta) { m_etaSeconds = eta; }
    void SetRequiredResources(uint16_t r) { m_requiredResources = r; }
    void SetPayloadLen(uint16_t len) { m_payloadLen = len; }

    // Getters
    uint16_t GetMagic() const { return m_magic; }
    uint8_t  GetVersion() const { return m_version; }
    uint8_t  GetMsgType() const { return m_msgType; }
    uint32_t GetSourceNodeId() const { return m_sourceNodeId; }
    uint32_t GetDestNodeId() const { return m_destNodeId; }
    uint16_t GetAmbulanceId() const { return m_ambulanceId; }
    uint32_t GetSeq() const { return m_seq; }
    uint64_t GetTxTimestampNs() const { return m_txTimestampNs; }
    float    GetPosX() const { return m_posX; }
    float    GetPosY() const { return m_posY; }
    float    GetSpeed() const { return m_speed; }
    float    GetHeading() const { return m_heading; }
    uint16_t GetEventOrCategory() const { return m_eventOrCategory; }
    uint8_t  GetStatusOrSeverity() const { return m_statusOrSeverity; }
    uint8_t  GetTargetHospitalId() const { return m_targetHospitalId; }
    float    GetEtaSeconds() const { return m_etaSeconds; }
    uint16_t GetRequiredResources() const { return m_requiredResources; }
    uint16_t GetPayloadLen() const { return m_payloadLen; }

private:
    static void WriteFloat(Buffer::Iterator &it, float val)
    {
        uint32_t u;
        std::memcpy(&u, &val, sizeof(float));
        it.WriteHtonU32(u);
    }

    static float ReadFloat(Buffer::Iterator &it)
    {
        uint32_t u = it.ReadNtohU32();
        float val;
        std::memcpy(&val, &u, sizeof(float));
        return val;
    }

    uint16_t m_magic;
    uint8_t  m_version;
    uint8_t  m_msgType;
    uint32_t m_sourceNodeId;
    uint32_t m_destNodeId;
    uint16_t m_ambulanceId;
    uint32_t m_seq;
    uint64_t m_txTimestampNs;
    float    m_posX;
    float    m_posY;
    float    m_speed;
    float    m_heading;
    uint16_t m_eventOrCategory;
    uint8_t  m_statusOrSeverity;
    uint8_t  m_targetHospitalId;
    float    m_etaSeconds;
    uint16_t m_requiredResources;
    uint16_t m_payloadLen;
};

// ===========================================================================
// Custom Sender Application: SmartAmbulanceSender
// ===========================================================================

class SmartAmbulanceSender : public Application
{
public:
    static TypeId GetTypeId(void)
    {
        static TypeId tid = TypeId("ns3::SmartAmbulanceSender")
            .SetParent<Application>()
            .SetGroupName("Applications")
            .AddConstructor<SmartAmbulanceSender>();
        return tid;
    }

    SmartAmbulanceSender()
        : m_ambulanceId(1),
          m_targetHospitalId(1),
          m_destAddress(Ipv4Address::GetAny()),
          m_destNodeId(0),
          m_port(9000),
          m_telemetryInterval(Seconds(1.0)),
          m_priorityTid(6),
          m_enableAlerts(true),
          m_hospitalPos(Vector(100.0, 400.0, 0.0)),
          m_seq(0),
          m_txTelemetry(0),
          m_txAlerts(0),
          m_txPrealerts(0),
          m_running(false)
    {
    }

    virtual ~SmartAmbulanceSender() override {}

    void Setup(uint16_t ambulanceId, uint8_t targetHospitalId,
               Ipv4Address destAddress, uint32_t destNodeId,
               uint16_t port, Time telemetryInterval,
               uint8_t priorityTid, bool enableAlerts,
               Vector hospitalPos)
    {
        m_ambulanceId = ambulanceId;
        m_targetHospitalId = targetHospitalId;
        m_destAddress = destAddress;
        m_destNodeId = destNodeId;
        m_port = port;
        m_telemetryInterval = telemetryInterval;
        m_priorityTid = priorityTid;
        m_enableAlerts = enableAlerts;
        m_hospitalPos = hospitalPos;
    }

    uint32_t GetTxTelemetry() const { return m_txTelemetry; }
    uint32_t GetTxAlerts() const { return m_txAlerts; }
    uint32_t GetTxPrealerts() const { return m_txPrealerts; }
    uint32_t GetTotalTx() const { return m_txTelemetry + m_txAlerts + m_txPrealerts; }

protected:
    virtual void StartApplication(void) override
    {
        m_running = true;
        m_socket = Socket::CreateSocket(GetNode(), UdpSocketFactory::GetTypeId());

        // Set socket priority and IPv4 ToS/DSCP
        m_socket->SetPriority(m_priorityTid);
        uint8_t tos = 0x00;
        if (m_priorityTid == 6) tos = 0xC0; // DSCP CS6 / Voice
        else if (m_priorityTid == 5) tos = 0x80; // DSCP CS4 / Video
        m_socket->SetIpTos(tos);

        // Schedule periodic telemetry
        Time initialOffset = Seconds(0.2 + m_ambulanceId * 0.15);
        m_telemetryEvent = Simulator::Schedule(initialOffset, &SmartAmbulanceSender::SendTelemetry, this);

        // Schedule event-triggered emergency messages if enabled
        if (m_enableAlerts)
        {
            Simulator::Schedule(Seconds(4.0 + m_ambulanceId * 0.5),
                                &SmartAmbulanceSender::SendEmergencyAlert, this,
                                100 + m_ambulanceId, 3); // Code Red: Severe Trauma
            Simulator::Schedule(Seconds(11.0 + m_ambulanceId * 0.5),
                                &SmartAmbulanceSender::SendEmergencyAlert, this,
                                200 + m_ambulanceId, 2); // Route Clearance Request

            // Pre-arrival milestone alerts with calculated ETA and resource requirements
            Simulator::Schedule(Seconds(3.0 + m_ambulanceId * 0.3),
                                &SmartAmbulanceSender::SendHospitalPrealert, this);
            Simulator::Schedule(Seconds(8.0 + m_ambulanceId * 0.3),
                                &SmartAmbulanceSender::SendHospitalPrealert, this);
            Simulator::Schedule(Seconds(15.0 + m_ambulanceId * 0.3),
                                &SmartAmbulanceSender::SendHospitalPrealert, this);
        }
    }

    virtual void StopApplication(void) override
    {
        m_running = false;
        Simulator::Cancel(m_telemetryEvent);
        if (m_socket)
        {
            m_socket->Close();
        }
    }

private:
    void SendTelemetry(void)
    {
        if (!m_running) return;

        Ptr<MobilityModel> mob = GetNode()->GetObject<MobilityModel>();
        Vector pos = mob ? mob->GetPosition() : Vector(0, 0, 0);
        Vector vel = mob ? mob->GetVelocity() : Vector(0, 0, 0);

        float speed = std::sqrt(vel.x * vel.x + vel.y * vel.y);
        float heading = (speed > 0.01f) ? (std::atan2(vel.y, vel.x) * 180.0f / M_PI) : 0.0f;
        if (heading < 0.0f) heading += 360.0f;

        double dx = m_hospitalPos.x - pos.x;
        double dy = m_hospitalPos.y - pos.y;
        double dist = std::sqrt(dx * dx + dy * dy);
        float eta = (speed > 1.0f) ? static_cast<float>(dist / speed) : static_cast<float>(dist / 15.0);

        AmbulanceAppHeader hdr;
        hdr.SetMsgType(MSG_AMBULANCE_TELEMETRY);
        hdr.SetSourceNodeId(GetNode()->GetId());
        hdr.SetDestNodeId(m_destNodeId);
        hdr.SetAmbulanceId(m_ambulanceId);
        hdr.SetSeq(++m_seq);
        hdr.SetTxTimestampNs(Simulator::Now().GetNanoSeconds());
        hdr.SetPosition(static_cast<float>(pos.x), static_cast<float>(pos.y));
        hdr.SetSpeed(speed);
        hdr.SetHeading(heading);
        hdr.SetEventOrCategory(1); // Normal active telemetry status
        hdr.SetStatusOrSeverity(1); // En-route to hospital
        hdr.SetTargetHospitalId(m_targetHospitalId);
        hdr.SetEtaSeconds(eta);
        hdr.SetRequiredResources(0x0003); // Standard monitoring + paramedic
        hdr.SetPayloadLen(0);

        Ptr<Packet> p = Create<Packet>(0);
        p->AddHeader(hdr);

        // Attach SocketPriorityTag to guarantee 802.11e MAC EDCA queue classification
        SocketPriorityTag tag;
        tag.SetPriority(m_priorityTid);
        p->AddPacketTag(tag);

        m_socket->SendTo(p, 0, InetSocketAddress(m_destAddress, m_port));
        m_txTelemetry++;

        m_telemetryEvent = Simulator::Schedule(m_telemetryInterval,
                                               &SmartAmbulanceSender::SendTelemetry, this);
    }

    void SendEmergencyAlert(uint32_t eventId, uint8_t severity)
    {
        if (!m_running) return;

        Ptr<MobilityModel> mob = GetNode()->GetObject<MobilityModel>();
        Vector pos = mob ? mob->GetPosition() : Vector(0, 0, 0);
        Vector vel = mob ? mob->GetVelocity() : Vector(0, 0, 0);
        float speed = std::sqrt(vel.x * vel.x + vel.y * vel.y);

        AmbulanceAppHeader hdr;
        hdr.SetMsgType(MSG_EMERGENCY_ALERT);
        hdr.SetSourceNodeId(GetNode()->GetId());
        hdr.SetDestNodeId(m_destNodeId);
        hdr.SetAmbulanceId(m_ambulanceId);
        hdr.SetSeq(++m_seq);
        hdr.SetTxTimestampNs(Simulator::Now().GetNanoSeconds());
        hdr.SetPosition(static_cast<float>(pos.x), static_cast<float>(pos.y));
        hdr.SetSpeed(speed);
        hdr.SetHeading(0.0f);
        hdr.SetEventOrCategory(eventId);
        hdr.SetStatusOrSeverity(severity);
        hdr.SetTargetHospitalId(m_targetHospitalId);
        hdr.SetEtaSeconds(0.0f);
        hdr.SetRequiredResources(0x000F); // Immediate resuscitation team
        hdr.SetPayloadLen(0);

        Ptr<Packet> p = Create<Packet>(0);
        p->AddHeader(hdr);

        // Emergency alerts always use highest priority
        SocketPriorityTag tag;
        tag.SetPriority(m_priorityTid > 0 ? 6 : 0);
        p->AddPacketTag(tag);

        m_socket->SendTo(p, 0, InetSocketAddress(m_destAddress, m_port));
        m_txAlerts++;

        std::cout << "[ALERT] " << Simulator::Now().GetSeconds() << "s | Ambulance "
                  << m_ambulanceId << " sent EMERGENCY_ALERT (Event=" << eventId
                  << ", Severity=" << (uint32_t)severity << ") to Node " << m_destNodeId << '\n';
    }

    void SendHospitalPrealert(void)
    {
        if (!m_running) return;

        Ptr<MobilityModel> mob = GetNode()->GetObject<MobilityModel>();
        Vector pos = mob ? mob->GetPosition() : Vector(0, 0, 0);
        Vector vel = mob ? mob->GetVelocity() : Vector(0, 0, 0);
        float speed = std::sqrt(vel.x * vel.x + vel.y * vel.y);

        double dx = m_hospitalPos.x - pos.x;
        double dy = m_hospitalPos.y - pos.y;
        double dist = std::sqrt(dx * dx + dy * dy);
        float eta = (speed > 1.0f) ? static_cast<float>(dist / speed) : static_cast<float>(dist / 15.0);

        AmbulanceAppHeader hdr;
        hdr.SetMsgType(MSG_HOSPITAL_PREALERT);
        hdr.SetSourceNodeId(GetNode()->GetId());
        hdr.SetDestNodeId(m_destNodeId);
        hdr.SetAmbulanceId(m_ambulanceId);
        hdr.SetSeq(++m_seq);
        hdr.SetTxTimestampNs(Simulator::Now().GetNanoSeconds());
        hdr.SetPosition(static_cast<float>(pos.x), static_cast<float>(pos.y));
        hdr.SetSpeed(speed);
        hdr.SetHeading(0.0f);
        hdr.SetEventOrCategory(1);
        hdr.SetStatusOrSeverity(2); // Inbound critical
        hdr.SetTargetHospitalId(m_targetHospitalId);
        hdr.SetEtaSeconds(eta);
        hdr.SetRequiredResources(0x0007); // ICU bed + Trauma team + CT scanner
        hdr.SetPayloadLen(0);

        Ptr<Packet> p = Create<Packet>(0);
        p->AddHeader(hdr);

        SocketPriorityTag tag;
        tag.SetPriority(m_priorityTid);
        p->AddPacketTag(tag);

        m_socket->SendTo(p, 0, InetSocketAddress(m_destAddress, m_port));
        m_txPrealerts++;

        std::cout << "[PREALERT] " << Simulator::Now().GetSeconds() << "s | Ambulance "
                  << m_ambulanceId << " sent HOSPITAL_PREALERT to Hospital "
                  << (uint32_t)m_targetHospitalId << " (Calculated ETA="
                  << std::fixed << std::setprecision(1) << eta << "s, Dist="
                  << std::fixed << std::setprecision(1) << dist << "m)\n";
    }

    uint16_t    m_ambulanceId;
    uint8_t     m_targetHospitalId;
    Ipv4Address m_destAddress;
    uint32_t    m_destNodeId;
    uint16_t    m_port;
    Time        m_telemetryInterval;
    uint8_t     m_priorityTid;
    bool        m_enableAlerts;
    Vector      m_hospitalPos;

    uint32_t    m_seq;
    uint32_t    m_txTelemetry;
    uint32_t    m_txAlerts;
    uint32_t    m_txPrealerts;

    Ptr<Socket> m_socket;
    EventId     m_telemetryEvent;
    bool        m_running;
};

// ===========================================================================
// Custom Sender Application: OrdinaryTrafficSender
// ===========================================================================

class OrdinaryTrafficSender : public Application
{
public:
    static TypeId GetTypeId(void)
    {
        static TypeId tid = TypeId("ns3::OrdinaryTrafficSender")
            .SetParent<Application>()
            .SetGroupName("Applications")
            .AddConstructor<OrdinaryTrafficSender>();
        return tid;
    }

    OrdinaryTrafficSender()
        : m_sourceIndex(0),
          m_category(CAT_ENVIRONMENTAL_TELEMETRY),
          m_destAddress(Ipv4Address::GetAny()),
          m_destNodeId(0),
          m_port(9000),
          m_packetInterval(Seconds(0.2)),
          m_packetSize(256),
          m_seq(0),
          m_txCount(0),
          m_running(false)
    {
    }

    virtual ~OrdinaryTrafficSender() override {}

    void Setup(uint32_t sourceIndex, OrdinaryTrafficCategory category,
               Ipv4Address destAddress, uint32_t destNodeId,
               uint16_t port, Time packetInterval, uint32_t packetSize)
    {
        m_sourceIndex = sourceIndex;
        m_category = category;
        m_destAddress = destAddress;
        m_destNodeId = destNodeId;
        m_port = port;
        m_packetInterval = packetInterval;
        m_packetSize = packetSize;
    }

    uint32_t GetTxCount() const { return m_txCount; }

protected:
    virtual void StartApplication(void) override
    {
        m_running = true;
        m_socket = Socket::CreateSocket(GetNode(), UdpSocketFactory::GetTypeId());

        // Baseline Best Effort priority (TID 0 / AC_BE)
        m_socket->SetPriority(0);
        m_socket->SetIpTos(0x00);

        Ptr<UniformRandomVariable> uv = CreateObject<UniformRandomVariable>();
        double startJitter = uv->GetValue(1.0, 1.8);
        m_sendEvent = Simulator::Schedule(Seconds(startJitter), &OrdinaryTrafficSender::SendPacket, this);
    }

    virtual void StopApplication(void) override
    {
        m_running = false;
        Simulator::Cancel(m_sendEvent);
        if (m_socket)
        {
            m_socket->Close();
        }
    }

private:
    void SendPacket(void)
    {
        if (!m_running) return;

        Ptr<MobilityModel> mob = GetNode()->GetObject<MobilityModel>();
        Vector pos = mob ? mob->GetPosition() : Vector(0, 0, 0);

        AmbulanceAppHeader hdr;
        hdr.SetMsgType(MSG_ORDINARY_TELEMETRY);
        hdr.SetSourceNodeId(GetNode()->GetId());
        hdr.SetDestNodeId(m_destNodeId);
        hdr.SetAmbulanceId(0);
        hdr.SetSeq(++m_seq);
        hdr.SetTxTimestampNs(Simulator::Now().GetNanoSeconds());
        hdr.SetPosition(static_cast<float>(pos.x), static_cast<float>(pos.y));
        hdr.SetSpeed(0.0f);
        hdr.SetHeading(0.0f);
        hdr.SetEventOrCategory(static_cast<uint16_t>(m_category));
        hdr.SetStatusOrSeverity(0);
        hdr.SetTargetHospitalId(0);
        hdr.SetEtaSeconds(0.0f);
        hdr.SetRequiredResources(0);

        uint32_t hdrSize = hdr.GetSerializedSize();
        uint32_t payloadLen = (m_packetSize > hdrSize) ? (m_packetSize - hdrSize) : 0;
        hdr.SetPayloadLen(static_cast<uint16_t>(payloadLen));

        Ptr<Packet> p = Create<Packet>(payloadLen);
        p->AddHeader(hdr);

        // Best Effort tag
        SocketPriorityTag tag;
        tag.SetPriority(0);
        p->AddPacketTag(tag);

        m_socket->SendTo(p, 0, InetSocketAddress(m_destAddress, m_port));
        m_txCount++;

        m_sendEvent = Simulator::Schedule(m_packetInterval, &OrdinaryTrafficSender::SendPacket, this);
    }

    uint32_t                 m_sourceIndex;
    OrdinaryTrafficCategory  m_category;
    Ipv4Address              m_destAddress;
    uint32_t                 m_destNodeId;
    uint16_t                 m_port;
    Time                     m_packetInterval;
    uint32_t                 m_packetSize;

    uint32_t                 m_seq;
    uint32_t                 m_txCount;
    Ptr<Socket>              m_socket;
    EventId                  m_sendEvent;
    bool                     m_running;
};

// ===========================================================================
// Custom Receiver Application: SmartAmbulanceReceiver
// ===========================================================================

struct AmbulancePerRxStats
{
    uint32_t rxCount = 0;
    uint32_t rxTelemetry = 0;
    uint32_t rxAlerts = 0;
    uint32_t rxPrealerts = 0;
    double   totalDelayMs = 0.0;
    double   minDelayMs = 1e9;
    double   maxDelayMs = 0.0;
    double   totalJitterMs = 0.0;
    double   lastDelayMs = 0.0;
    uint32_t duplicateOrOutOfOrder = 0;
    uint32_t missingSeq = 0;
};

class SmartAmbulanceReceiver : public Application
{
public:
    static TypeId GetTypeId(void)
    {
        static TypeId tid = TypeId("ns3::SmartAmbulanceReceiver")
            .SetParent<Application>()
            .SetGroupName("Applications")
            .AddConstructor<SmartAmbulanceReceiver>();
        return tid;
    }

    SmartAmbulanceReceiver()
        : m_port(9000),
          m_receiverId(1),
          m_name("Hospital-A"),
          m_totalPacketsReceived(0),
          m_validAppMessagesReceived(0),
          m_malformedPackets(0),
          m_duplicateOrOutOfOrder(0),
          m_totalOrdinaryRx(0),
          m_totalAmbulanceRx(0),
          m_totalAlertsRx(0),
          m_totalPrealertsRx(0)
    {
    }

    virtual ~SmartAmbulanceReceiver() override {}

    void Setup(uint16_t port, uint8_t receiverId, const std::string &name)
    {
        m_port = port;
        m_receiverId = receiverId;
        m_name = name;
    }

    uint32_t GetTotalPacketsReceived() const { return m_totalPacketsReceived; }
    uint32_t GetValidAppMessagesReceived() const { return m_validAppMessagesReceived; }
    uint32_t GetMalformedPackets() const { return m_malformedPackets; }
    uint32_t GetTotalOrdinaryRx() const { return m_totalOrdinaryRx; }
    uint32_t GetTotalAmbulanceRx() const { return m_totalAmbulanceRx; }
    uint32_t GetTotalAlertsRx() const { return m_totalAlertsRx; }
    uint32_t GetTotalPrealertsRx() const { return m_totalPrealertsRx; }
    const std::map<uint16_t, AmbulancePerRxStats>& GetAmbulanceStats() const { return m_ambStats; }

protected:
    virtual void StartApplication(void) override
    {
        m_socket = Socket::CreateSocket(GetNode(), UdpSocketFactory::GetTypeId());
        InetSocketAddress local = InetSocketAddress(Ipv4Address::GetAny(), m_port);
        m_socket->Bind(local);
        m_socket->SetRecvCallback(MakeCallback(&SmartAmbulanceReceiver::HandleRead, this));
    }

    virtual void StopApplication(void) override
    {
        if (m_socket)
        {
            m_socket->Close();
        }
    }

private:
    void HandleRead(Ptr<Socket> socket)
    {
        Ptr<Packet> packet;
        Address from;
        while ((packet = socket->RecvFrom(from)))
        {
            m_totalPacketsReceived++;

            if (packet->GetSize() < 50)
            {
                m_malformedPackets++;
                continue;
            }

            AmbulanceAppHeader hdr;
            packet->RemoveHeader(hdr);

            if (hdr.GetMagic() != AmbulanceAppHeader::MAGIC || hdr.GetVersion() != AmbulanceAppHeader::VERSION)
            {
                m_malformedPackets++;
                continue;
            }

            m_validAppMessagesReceived++;

            uint64_t nowNs = Simulator::Now().GetNanoSeconds();
            double delayMs = (nowNs >= hdr.GetTxTimestampNs())
                ? (nowNs - hdr.GetTxTimestampNs()) / 1e6
                : 0.0;

            uint32_t srcId = hdr.GetSourceNodeId();
            uint32_t seq = hdr.GetSeq();

            if (m_lastSeq.find(srcId) != m_lastSeq.end())
            {
                uint32_t last = m_lastSeq[srcId];
                if (seq <= last)
                {
                    m_duplicateOrOutOfOrder++;
                }
                else if (seq > last + 1)
                {
                    // Track gap
                }
            }
            m_lastSeq[srcId] = seq;

            uint8_t type = hdr.GetMsgType();
            if (type == MSG_ORDINARY_TELEMETRY)
            {
                m_totalOrdinaryRx++;
            }
            else
            {
                m_totalAmbulanceRx++;
                uint16_t ambId = hdr.GetAmbulanceId();
                auto &st = m_ambStats[ambId];
                st.rxCount++;
                st.totalDelayMs += delayMs;
                if (delayMs < st.minDelayMs) st.minDelayMs = delayMs;
                if (delayMs > st.maxDelayMs) st.maxDelayMs = delayMs;

                if (st.rxCount > 1)
                {
                    double j = std::abs(delayMs - st.lastDelayMs);
                    st.totalJitterMs += j;
                }
                st.lastDelayMs = delayMs;

                if (type == MSG_AMBULANCE_TELEMETRY)
                {
                    st.rxTelemetry++;
                }
                else if (type == MSG_EMERGENCY_ALERT)
                {
                    st.rxAlerts++;
                    m_totalAlertsRx++;
                }
                else if (type == MSG_HOSPITAL_PREALERT)
                {
                    st.rxPrealerts++;
                    m_totalPrealertsRx++;
                }
            }
        }
    }

    uint16_t                                  m_port;
    uint8_t                                   m_receiverId;
    std::string                               m_name;
    Ptr<Socket>                               m_socket;

    uint32_t                                  m_totalPacketsReceived;
    uint32_t                                  m_validAppMessagesReceived;
    uint32_t                                  m_malformedPackets;
    uint32_t                                  m_duplicateOrOutOfOrder;
    uint32_t                                  m_totalOrdinaryRx;
    uint32_t                                  m_totalAmbulanceRx;
    uint32_t                                  m_totalAlertsRx;
    uint32_t                                  m_totalPrealertsRx;

    std::map<uint32_t, uint32_t>              m_lastSeq;
    std::map<uint16_t, AmbulancePerRxStats>   m_ambStats;
};

// ===========================================================================
// Main Simulation Function
// ===========================================================================

int main(int argc, char *argv[])
{
    // Command-line parameters
    uint32_t numAmbulances = 1;
    uint32_t numOrdinarySources = 10;
    uint32_t numReceivers = 1;
    double   simulationTime = 20.0;
    uint32_t mobilityMode = 1; // 0=Static, 1=RandomWaypoint, 2=RandomWalk2d
    double   areaSize = 500.0;
    double   minSpeed = 10.0;
    double   maxSpeed = 25.0;
    double   pauseTime = 1.0;
    uint32_t propModel = 0; // 0=LogDistance, 1=Friis, 2=Nakagami
    double   lossExponent = 2.2; // Realistic outdoor suburban vehicular path loss exponent
    std::string phyRate = "ErpOfdmRate12Mbps";
    double   txPower = 20.0; // dBm (100 mW standard vehicular Wi-Fi)
    bool     priorityEnabled = true;
    uint32_t ambulancePriorityMode = 2; // 0=BE (TID 0), 1=VI (TID 5), 2=VO (TID 6)
    std::string ordinaryDataRate = "100kbps";
    uint32_t ordinaryPacketSize = 256;
    bool     enableAnim = false;
    std::string animFile = "results/animation/ambulance-network-animation.xml";
    std::string csvOutput = "";
    std::string expId = "DEFAULT";
    uint32_t runNumber = 1;

    CommandLine cmd(__FILE__);
    cmd.AddValue("numAmbulances", "Number of ambulances (1-5)", numAmbulances);
    cmd.AddValue("numOrdinarySources", "Number of ordinary traffic sources (10-150)", numOrdinarySources);
    cmd.AddValue("numReceivers", "Number of receiver infrastructure nodes (1 or 2)", numReceivers);
    cmd.AddValue("simulationTime", "Simulation duration in seconds", simulationTime);
    cmd.AddValue("mobilityMode", "Mobility: 0=Static, 1=RandomWaypoint, 2=RandomWalk2d", mobilityMode);
    cmd.AddValue("areaSize", "Simulation area side in meters", areaSize);
    cmd.AddValue("minSpeed", "Minimum speed in m/s", minSpeed);
    cmd.AddValue("maxSpeed", "Maximum speed in m/s", maxSpeed);
    cmd.AddValue("pauseTime", "Pause time in seconds", pauseTime);
    cmd.AddValue("propModel", "Propagation model: 0=LogDistance, 1=Friis, 2=Nakagami", propModel);
    cmd.AddValue("lossExponent", "Path loss exponent for LogDistance/Nakagami (default: 2.2)", lossExponent);
    cmd.AddValue("phyRate", "Wi-Fi 802.11g PHY data rate", phyRate);
    cmd.AddValue("txPower", "Wi-Fi Transmit Power in dBm", txPower);
    cmd.AddValue("priorityEnabled", "Enable QoS emergency priority", priorityEnabled);
    cmd.AddValue("ambulancePriorityMode", "Ambulance QoS mode: 0=BE, 1=VI, 2=VO", ambulancePriorityMode);
    cmd.AddValue("ordinaryDataRate", "Ordinary traffic rate per source", ordinaryDataRate);
    cmd.AddValue("ordinaryPacketSize", "Ordinary message size in bytes", ordinaryPacketSize);
    cmd.AddValue("enableAnim", "Generate NetAnim XML animation trace", enableAnim);
    cmd.AddValue("animFile", "Path to save NetAnim XML", animFile);
    cmd.AddValue("csvOutput", "CSV summary output filepath", csvOutput);
    cmd.AddValue("expId", "Experiment ID label for benchmarking", expId);
    cmd.AddValue("RngRun", "Random run number for reproducibility", runNumber);
    cmd.Parse(argc, argv);

    // Validate parameters
    if (numAmbulances < 1 || numAmbulances > 10)
    {
        std::cerr << "Error: numAmbulances must be between 1 and 10.\n";
        return 1;
    }
    if (numOrdinarySources < 1 || numOrdinarySources > 200)
    {
        std::cerr << "Error: numOrdinarySources must be between 1 and 200.\n";
        return 1;
    }
    if (simulationTime < 3.0)
    {
        std::cerr << "Error: simulationTime must be at least 3.0 seconds.\n";
        return 1;
    }

    uint8_t priorityTid = 0;
    if (priorityEnabled)
    {
        if (ambulancePriorityMode == 2) priorityTid = 6;      // Voice / AC_VO
        else if (ambulancePriorityMode == 1) priorityTid = 5; // Video / AC_VI
        else priorityTid = 0;                                 // Best Effort / AC_BE
    }

    const char* modeNames[] = {"BE (Best Effort)", "VI (Video)", "VO (Voice)"};
    const char* propNames[] = {"LogDistance", "Friis", "Nakagami"};
    const char* mobNames[]  = {"Static", "RandomWaypoint", "RandomWalk2d"};

    std::cout << "\n=======================================================\n"
              << "  SMART AMBULANCE NETWORKING SIMULATION (NS-3.45)\n"
              << "=======================================================\n"
              << "Experiment ID:            " << expId << '\n'
              << "Ambulances:               " << numAmbulances << '\n'
              << "Ordinary Traffic Sources: " << numOrdinarySources << '\n'
              << "Receivers (Hospitals):    " << numReceivers << '\n'
              << "Mobility Model:           " << mobNames[mobilityMode] << '\n'
              << "Area Size:                " << areaSize << " x " << areaSize << " m\n"
              << "Propagation Model:        " << propNames[propModel] << '\n'
              << "PHY Mode / Data Rate:     " << phyRate << '\n'
              << "Transmit Power:           " << txPower << " dBm\n"
              << "Emergency Priority:       " << (priorityEnabled ? "ENABLED" : "DISABLED")
              << " [" << modeNames[ambulancePriorityMode] << ", TID=" << (uint32_t)priorityTid << "]\n"
              << "Simulation Duration:      " << simulationTime << " s\n"
              << "=======================================================\n";

    // Total nodes: Ambulances + Ordinary Sources + Receivers
    uint32_t totalNodes = numAmbulances + numOrdinarySources + numReceivers;
    NodeContainer allNodes;
    allNodes.Create(totalNodes);

    NodeContainer ambulanceNodes;
    for (uint32_t i = 0; i < numAmbulances; ++i)
        ambulanceNodes.Add(allNodes.Get(i));

    NodeContainer ordinaryNodes;
    for (uint32_t i = 0; i < numOrdinarySources; ++i)
        ordinaryNodes.Add(allNodes.Get(numAmbulances + i));

    NodeContainer receiverNodes;
    for (uint32_t i = 0; i < numReceivers; ++i)
        receiverNodes.Add(allNodes.Get(numAmbulances + numOrdinarySources + i));

    // Wireless Channel & Propagation Configuration
    YansWifiChannelHelper channelHelper;
    channelHelper.SetPropagationDelay("ns3::ConstantSpeedPropagationDelayModel");

    if (propModel == 0) // LogDistance
    {
        channelHelper.AddPropagationLoss("ns3::LogDistancePropagationLossModel",
                                        "Exponent", DoubleValue(lossExponent),
                                        "ReferenceLoss", DoubleValue(46.6777));
    }
    else if (propModel == 1) // Friis
    {
        channelHelper.AddPropagationLoss("ns3::FriisPropagationLossModel");
    }
    else if (propModel == 2) // Nakagami fading with LogDistance
    {
        channelHelper.AddPropagationLoss("ns3::LogDistancePropagationLossModel",
                                        "Exponent", DoubleValue(lossExponent),
                                        "ReferenceLoss", DoubleValue(46.6777));
        channelHelper.AddPropagationLoss("ns3::NakagamiPropagationLossModel",
                                        "m0", DoubleValue(1.0),
                                        "m1", DoubleValue(1.0),
                                        "m2", DoubleValue(1.0));
    }

    YansWifiPhyHelper phyHelper;
    phyHelper.SetChannel(channelHelper.Create());
    phyHelper.Set("TxPowerStart", DoubleValue(txPower));
    phyHelper.Set("TxPowerEnd", DoubleValue(txPower));

    WifiHelper wifiHelper;
    wifiHelper.SetStandard(WIFI_STANDARD_80211g);
    wifiHelper.SetRemoteStationManager("ns3::ConstantRateWifiManager",
                                      "DataMode", StringValue(phyRate),
                                      "ControlMode", StringValue(phyRate));

    // Enable QoS in Ad-hoc Wi-Fi MAC for 802.11e EDCA multi-queue support
    WifiMacHelper macHelper;
    macHelper.SetType("ns3::AdhocWifiMac",
                      "QosSupported", BooleanValue(true));

    NetDeviceContainer devices = wifiHelper.Install(phyHelper, macHelper, allNodes);

    // Mobility Configuration
    MobilityHelper mobility;
    Vector hospital1Pos(100.0, areaSize * 0.8, 0.0);
    Vector hospital2Pos(areaSize * 0.9, areaSize * 0.9, 0.0);

    if (mobilityMode == 0) // Static
    {
        mobility.SetMobilityModel("ns3::ConstantPositionMobilityModel");
        mobility.Install(allNodes);

        // Ambulances placed along diagonal
        for (uint32_t i = 0; i < numAmbulances; ++i)
        {
            double x = 50.0 + i * 30.0;
            double y = 50.0 + i * 25.0;
            allNodes.Get(i)->GetObject<MobilityModel>()->SetPosition(Vector(x, y, 0.0));
        }

        // Ordinary sources placed in a grid
        uint32_t cols = static_cast<uint32_t>(std::ceil(std::sqrt(numOrdinarySources)));
        for (uint32_t i = 0; i < numOrdinarySources; ++i)
        {
            uint32_t row = i / cols;
            uint32_t col = i % cols;
            double x = 40.0 + col * (areaSize * 0.85 / cols);
            double y = 40.0 + row * (areaSize * 0.85 / cols);
            allNodes.Get(numAmbulances + i)->GetObject<MobilityModel>()->SetPosition(Vector(x, y, 0.0));
        }

        // Receivers
        allNodes.Get(numAmbulances + numOrdinarySources)->GetObject<MobilityModel>()->SetPosition(hospital1Pos);
        if (numReceivers > 1)
        {
            allNodes.Get(numAmbulances + numOrdinarySources + 1)->GetObject<MobilityModel>()->SetPosition(hospital2Pos);
        }
    }
    else if (mobilityMode == 1) // Random Waypoint
    {
        // Infrastructure receivers are always stationary
        MobilityHelper staticMob;
        staticMob.SetMobilityModel("ns3::ConstantPositionMobilityModel");
        staticMob.Install(receiverNodes);
        receiverNodes.Get(0)->GetObject<MobilityModel>()->SetPosition(hospital1Pos);
        if (numReceivers > 1)
        {
            receiverNodes.Get(1)->GetObject<MobilityModel>()->SetPosition(hospital2Pos);
        }

        ObjectFactory posAlloc;
        posAlloc.SetTypeId("ns3::RandomRectanglePositionAllocator");
        posAlloc.Set("X", StringValue("ns3::UniformRandomVariable[Min=0.0|Max=" + std::to_string(areaSize) + "]"));
        posAlloc.Set("Y", StringValue("ns3::UniformRandomVariable[Min=0.0|Max=" + std::to_string(areaSize) + "]"));
        Ptr<PositionAllocator> taPositionAlloc = posAlloc.Create()->GetObject<PositionAllocator>();

        // Mobile ambulance nodes
        mobility.SetPositionAllocator("ns3::RandomRectanglePositionAllocator",
                                     "X", StringValue("ns3::UniformRandomVariable[Min=30.0|Max=150.0]"),
                                     "Y", StringValue("ns3::UniformRandomVariable[Min=30.0|Max=150.0]"));
        mobility.SetMobilityModel("ns3::RandomWaypointMobilityModel",
                                 "Speed", StringValue("ns3::UniformRandomVariable[Min=" + std::to_string(minSpeed) + "|Max=" + std::to_string(maxSpeed) + "]"),
                                 "Pause", StringValue("ns3::ConstantRandomVariable[Constant=" + std::to_string(pauseTime) + "]"),
                                 "PositionAllocator", PointerValue(taPositionAlloc));
        mobility.Install(ambulanceNodes);

        // Mobile ordinary nodes
        MobilityHelper ordinaryMob;
        ordinaryMob.SetPositionAllocator("ns3::RandomRectanglePositionAllocator",
                                        "X", StringValue("ns3::UniformRandomVariable[Min=0.0|Max=" + std::to_string(areaSize) + "]"),
                                        "Y", StringValue("ns3::UniformRandomVariable[Min=0.0|Max=" + std::to_string(areaSize) + "]"));
        ordinaryMob.SetMobilityModel("ns3::RandomWaypointMobilityModel",
                                    "Speed", StringValue("ns3::UniformRandomVariable[Min=5.0|Max=15.0]"),
                                    "Pause", StringValue("ns3::ConstantRandomVariable[Constant=1.0]"),
                                    "PositionAllocator", PointerValue(taPositionAlloc));
        ordinaryMob.Install(ordinaryNodes);
    }
    else // Random Walk 2D
    {
        MobilityHelper staticMob;
        staticMob.SetMobilityModel("ns3::ConstantPositionMobilityModel");
        staticMob.Install(receiverNodes);
        receiverNodes.Get(0)->GetObject<MobilityModel>()->SetPosition(hospital1Pos);
        if (numReceivers > 1)
        {
            receiverNodes.Get(1)->GetObject<MobilityModel>()->SetPosition(hospital2Pos);
        }

        mobility.SetPositionAllocator("ns3::RandomRectanglePositionAllocator",
                                     "X", StringValue("ns3::UniformRandomVariable[Min=0.0|Max=" + std::to_string(areaSize) + "]"),
                                     "Y", StringValue("ns3::UniformRandomVariable[Min=0.0|Max=" + std::to_string(areaSize) + "]"));
        mobility.SetMobilityModel("ns3::RandomWalk2dMobilityModel",
                                 "Bounds", RectangleValue(Rectangle(0, areaSize, 0, areaSize)),
                                 "Speed", StringValue("ns3::UniformRandomVariable[Min=" + std::to_string(minSpeed) + "|Max=" + std::to_string(maxSpeed) + "]"),
                                 "Distance", DoubleValue(50.0));
        mobility.Install(ambulanceNodes);
        mobility.Install(ordinaryNodes);
    }

    // Internet Stack & IP Addressing
    InternetStackHelper internet;
    internet.Install(allNodes);

    Ipv4AddressHelper ipv4;
    ipv4.SetBase("10.1.0.0", "255.255.0.0");
    Ipv4InterfaceContainer interfaces = ipv4.Assign(devices);

    const uint16_t port = 9000;

    // Install Smart Receivers on Hospital Nodes
    std::vector<Ptr<SmartAmbulanceReceiver>> hospitalReceivers;
    for (uint32_t r = 0; r < numReceivers; ++r)
    {
        uint32_t rNodeIdx = numAmbulances + numOrdinarySources + r;
        Ptr<SmartAmbulanceReceiver> rxApp = CreateObject<SmartAmbulanceReceiver>();
        std::string hName = (r == 0) ? "Hospital-A" : "Hospital-B";
        rxApp->Setup(port, static_cast<uint8_t>(r + 1), hName);
        allNodes.Get(rNodeIdx)->AddApplication(rxApp);
        rxApp->SetStartTime(Seconds(0.5));
        rxApp->SetStopTime(Seconds(simulationTime));
        hospitalReceivers.push_back(rxApp);
    }

    // Install Smart Ambulance Senders
    std::vector<Ptr<SmartAmbulanceSender>> ambulanceSenders;
    for (uint32_t a = 0; a < numAmbulances; ++a)
    {
        // Destination hospital selection (alternate if multiple hospitals configured)
        uint32_t targetHospitalIdx = (numReceivers > 1 && (a % 2 == 1)) ? 1 : 0;
        uint32_t destNodeIdx = numAmbulances + numOrdinarySources + targetHospitalIdx;
        Ipv4Address destAddr = interfaces.GetAddress(destNodeIdx);
        Vector targetHospPos = (targetHospitalIdx == 1) ? hospital2Pos : hospital1Pos;

        Ptr<SmartAmbulanceSender> ambApp = CreateObject<SmartAmbulanceSender>();
        ambApp->Setup(static_cast<uint16_t>(a + 1),
                      static_cast<uint8_t>(targetHospitalIdx + 1),
                      destAddr, destNodeIdx, port,
                      Seconds(1.0), priorityTid, true, targetHospPos);
        allNodes.Get(a)->AddApplication(ambApp);
        ambApp->SetStartTime(Seconds(1.0));
        ambApp->SetStopTime(Seconds(simulationTime - 0.5));
        ambulanceSenders.push_back(ambApp);
    }

    // Install Ordinary Traffic Senders
    DataRate rate(ordinaryDataRate);
    double bitsPerSec = rate.GetBitRate();
    double packetIntervalSec = (ordinaryPacketSize * 8.0) / bitsPerSec;
    if (packetIntervalSec < 0.01) packetIntervalSec = 0.01;

    std::vector<Ptr<OrdinaryTrafficSender>> ordinarySenders;
    for (uint32_t o = 0; o < numOrdinarySources; ++o)
    {
        uint32_t oNodeIdx = numAmbulances + o;
        uint32_t targetHospitalIdx = (numReceivers > 1 && (o % 2 == 1)) ? 1 : 0;
        uint32_t destNodeIdx = numAmbulances + numOrdinarySources + targetHospitalIdx;
        Ipv4Address destAddr = interfaces.GetAddress(destNodeIdx);

        OrdinaryTrafficCategory cat = static_cast<OrdinaryTrafficCategory>((o % 4) + 1);

        Ptr<OrdinaryTrafficSender> ordApp = CreateObject<OrdinaryTrafficSender>();
        ordApp->Setup(o + 1, cat, destAddr, destNodeIdx, port,
                      Seconds(packetIntervalSec), ordinaryPacketSize);
        allNodes.Get(oNodeIdx)->AddApplication(ordApp);
        ordApp->SetStartTime(Seconds(1.5));
        ordApp->SetStopTime(Seconds(simulationTime - 0.5));
        ordinarySenders.push_back(ordApp);
    }

    // Optional NetAnim Visualization
    std::unique_ptr<AnimationInterface> anim;
    if (enableAnim)
    {
        anim = std::make_unique<AnimationInterface>(animFile);
        anim->SetMaxPktsPerTraceFile(500000);
        anim->SetMobilityPollInterval(Seconds(0.25));

        for (uint32_t a = 0; a < numAmbulances; ++a)
        {
            anim->UpdateNodeDescription(allNodes.Get(a), "Ambulance-" + std::to_string(a + 1));
            anim->UpdateNodeColor(allNodes.Get(a), 255, 0, 0); // Red
            anim->UpdateNodeSize(allNodes.Get(a), 8.0, 8.0);
        }
        for (uint32_t o = 0; o < numOrdinarySources; ++o)
        {
            uint32_t oNodeIdx = numAmbulances + o;
            anim->UpdateNodeDescription(allNodes.Get(oNodeIdx), "Traffic-" + std::to_string(o + 1));
            anim->UpdateNodeColor(allNodes.Get(oNodeIdx), 0, 100, 255); // Blue
            anim->UpdateNodeSize(allNodes.Get(oNodeIdx), 3.0, 3.0);
        }
        for (uint32_t r = 0; r < numReceivers; ++r)
        {
            uint32_t rNodeIdx = numAmbulances + numOrdinarySources + r;
            std::string name = (r == 0) ? "Hospital-A" : "Hospital-B";
            anim->UpdateNodeDescription(allNodes.Get(rNodeIdx), name);
            anim->UpdateNodeColor(allNodes.Get(rNodeIdx), 0, 200, 0); // Green
            anim->UpdateNodeSize(allNodes.Get(rNodeIdx), 12.0, 12.0);
        }
    }

    // FlowMonitor Installation
    FlowMonitorHelper flowHelper;
    Ptr<FlowMonitor> monitor = flowHelper.InstallAll();

    // Execute Simulation
    Simulator::Stop(Seconds(simulationTime));
    Simulator::Run();
    monitor->CheckForLostPackets();

    // Process FlowMonitor Network Metrics
    Ptr<Ipv4FlowClassifier> classifier = DynamicCast<Ipv4FlowClassifier>(flowHelper.GetClassifier());
    auto stats = monitor->GetFlowStats();

    uint64_t totalTxPackets = 0, totalRxPackets = 0, totalLostPackets = 0;
    uint64_t ambTxPackets = 0, ambRxPackets = 0, ambLostPackets = 0;
    double   ambTotalDelaySum = 0.0, ambTotalJitterSum = 0.0;
    uint64_t ambRxBytes = 0;
    double   ambFirstTx = 1e9, ambLastRx = 0.0;

    for (const auto &entry : stats)
    {
        const auto &s = entry.second;
        auto tuple = classifier->FindFlow(entry.first);

        totalTxPackets += s.txPackets;
        totalRxPackets += s.rxPackets;
        totalLostPackets += s.lostPackets;

        // Identify if this flow originated from an ambulance node
        bool isAmbulanceFlow = false;
        for (uint32_t a = 0; a < numAmbulances; ++a)
        {
            if (tuple.sourceAddress == interfaces.GetAddress(a))
            {
                isAmbulanceFlow = true;
                break;
            }
        }

        if (isAmbulanceFlow)
        {
            ambTxPackets += s.txPackets;
            ambRxPackets += s.rxPackets;
            ambLostPackets += s.lostPackets;
            ambTotalDelaySum += s.delaySum.GetSeconds();
            ambTotalJitterSum += s.jitterSum.GetSeconds();
            ambRxBytes += s.rxBytes;
            if (s.timeFirstTxPacket.GetSeconds() < ambFirstTx) ambFirstTx = s.timeFirstTxPacket.GetSeconds();
            if (s.timeLastRxPacket.GetSeconds() > ambLastRx) ambLastRx = s.timeLastRxPacket.GetSeconds();
        }
    }

    double ambAvgDelayMs = (ambRxPackets > 0) ? (ambTotalDelaySum * 1000.0 / ambRxPackets) : 0.0;
    double ambAvgJitterMs = (ambRxPackets > 1) ? (ambTotalJitterSum * 1000.0 / (ambRxPackets - 1)) : 0.0;
    double ambDuration = (ambLastRx > ambFirstTx) ? (ambLastRx - ambFirstTx) : (simulationTime - 1.5);
    double ambThroughputKbps = (ambDuration > 0) ? (ambRxBytes * 8.0 / ambDuration / 1000.0) : 0.0;
    double ambDeliveryRatio = (ambTxPackets > 0) ? (100.0 * ambRxPackets / ambTxPackets) : 0.0;

    // Aggregate Application-Level Receiver Metrics
    uint32_t appTotalRx = 0;
    uint32_t appValidMessages = 0;
    uint32_t appMalformed = 0;
    uint32_t appAlertsRx = 0;
    uint32_t appPrealertsRx = 0;
    uint32_t appOrdinaryRx = 0;
    uint32_t appAmbulanceRx = 0;

    for (const auto &rxApp : hospitalReceivers)
    {
        appTotalRx += rxApp->GetTotalPacketsReceived();
        appValidMessages += rxApp->GetValidAppMessagesReceived();
        appMalformed += rxApp->GetMalformedPackets();
        appAlertsRx += rxApp->GetTotalAlertsRx();
        appPrealertsRx += rxApp->GetTotalPrealertsRx();
        appOrdinaryRx += rxApp->GetTotalOrdinaryRx();
        appAmbulanceRx += rxApp->GetTotalAmbulanceRx();
    }

    uint32_t appAmbulanceTx = 0;
    for (const auto &ambApp : ambulanceSenders)
    {
        appAmbulanceTx += ambApp->GetTotalTx();
    }

    double appAmbulancePdr = (appAmbulanceTx > 0) ? (100.0 * appAmbulanceRx / appAmbulanceTx) : 0.0;
    double networkPdr = (totalTxPackets > 0) ? (100.0 * totalRxPackets / totalTxPackets) : 0.0;

    std::cout << "\n=== SIMULATION RESULTS SUMMARY ===\n"
              << "Network Total TX Packets:       " << totalTxPackets << '\n'
              << "Network Total RX Packets:       " << totalRxPackets << '\n'
              << "Network FlowMonitor Lost:       " << totalLostPackets << '\n'
              << "Network Delivery Ratio:         " << std::fixed << std::setprecision(2) << networkPdr << "%\n"
              << "-------------------------------------------------------\n"
              << "Ambulance Total TX:             " << ambTxPackets << " (App TX: " << appAmbulanceTx << ")\n"
              << "Ambulance Total RX:             " << ambRxPackets << " (App RX: " << appAmbulanceRx << ")\n"
              << "Ambulance FlowMonitor Lost:     " << ambLostPackets << '\n'
              << "Ambulance Delivery Ratio (PDR): " << std::fixed << std::setprecision(2) << ambDeliveryRatio << "% (App PDR: " << appAmbulancePdr << "%)\n"
              << "Ambulance Average Delay:        " << std::fixed << std::setprecision(3) << ambAvgDelayMs << " ms\n"
              << "Ambulance Average Jitter:       " << std::fixed << std::setprecision(3) << ambAvgJitterMs << " ms\n"
              << "Ambulance Throughput:           " << std::fixed << std::setprecision(3) << ambThroughputKbps << " kbps\n"
              << "-------------------------------------------------------\n"
              << "Valid Application Messages:     " << appValidMessages << " / " << appTotalRx << '\n'
              << "Malformed Messages Detected:    " << appMalformed << '\n'
              << "Emergency Alerts Delivered:     " << appAlertsRx << '\n'
              << "Hospital Pre-Alerts Delivered:  " << appPrealertsRx << '\n'
              << "=======================================================\n";

    // Print Detailed Per-Ambulance Statistics
    for (uint32_t a = 0; a < numAmbulances; ++a)
    {
        uint16_t ambId = a + 1;
        uint32_t txA = ambulanceSenders[a]->GetTotalTx();
        uint32_t rxA = 0;
        double delayA = 0.0, jitterA = 0.0;

        for (const auto &rxApp : hospitalReceivers)
        {
            const auto &ambMap = rxApp->GetAmbulanceStats();
            if (ambMap.find(ambId) != ambMap.end())
            {
                const auto &st = ambMap.at(ambId);
                rxA += st.rxCount;
                if (st.rxCount > 0) delayA = st.totalDelayMs / st.rxCount;
                if (st.rxCount > 1) jitterA = st.totalJitterMs / (st.rxCount - 1);
            }
        }
        double pdrA = (txA > 0) ? (100.0 * rxA / txA) : 0.0;
        std::cout << "Ambulance " << ambId << " | TX: " << txA
                  << " | RX: " << rxA
                  << " | PDR: " << std::fixed << std::setprecision(2) << pdrA << "%"
                  << " | Delay: " << std::fixed << std::setprecision(3) << delayA << " ms"
                  << " | Jitter: " << jitterA << " ms\n";
    }

    // Append to CSV if requested
    if (!csvOutput.empty())
    {
        bool fileExists = std::ifstream(csvOutput).good();
        std::ofstream csv(csvOutput, std::ios::app);
        if (!fileExists)
        {
            csv << "exp_id,run,ambulances,ordinary_sources,receivers,mobility_mode,area_size,"
                << "prop_model,phy_rate,tx_power_dbm,priority_enabled,ambulance_priority_mode,priority_tid,"
                << "ordinary_rate,ordinary_pkt_size,duration_sec,"
                << "net_tx_packets,net_rx_packets,net_lost_packets,net_pdr_percent,"
                << "amb_tx_packets,amb_rx_packets,amb_lost_packets,amb_pdr_percent,"
                << "amb_delay_ms,amb_jitter_ms,amb_throughput_kbps,"
                << "app_valid_msgs,app_malformed_msgs,app_alerts_rx,app_prealerts_rx,app_ordinary_rx\n";
        }

        csv << expId << ","
            << runNumber << ","
            << numAmbulances << ","
            << numOrdinarySources << ","
            << numReceivers << ","
            << mobNames[mobilityMode] << ","
            << areaSize << ","
            << propNames[propModel] << ","
            << phyRate << ","
            << txPower << ","
            << (priorityEnabled ? "ON" : "OFF") << ","
            << modeNames[ambulancePriorityMode] << ","
            << (uint32_t)priorityTid << ","
            << ordinaryDataRate << ","
            << ordinaryPacketSize << ","
            << simulationTime << ","
            << totalTxPackets << ","
            << totalRxPackets << ","
            << totalLostPackets << ","
            << std::fixed << std::setprecision(2) << networkPdr << ","
            << ambTxPackets << ","
            << ambRxPackets << ","
            << ambLostPackets << ","
            << std::fixed << std::setprecision(2) << ambDeliveryRatio << ","
            << std::fixed << std::setprecision(4) << ambAvgDelayMs << ","
            << std::fixed << std::setprecision(4) << ambAvgJitterMs << ","
            << std::fixed << std::setprecision(3) << ambThroughputKbps << ","
            << appValidMessages << ","
            << appMalformed << ","
            << appAlertsRx << ","
            << appPrealertsRx << ","
            << appOrdinaryRx << "\n";

        csv.close();
        std::cout << "Appended result row to CSV: " << csvOutput << '\n';
    }

    if (enableAnim)
    {
        std::cout << "NetAnim trace saved to: " << animFile << '\n';
    }

    Simulator::Destroy();
    return 0;
}
