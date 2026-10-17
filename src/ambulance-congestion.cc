
#include "ns3/core-module.h"
#include "ns3/network-module.h"
#include "ns3/internet-module.h"
#include "ns3/wifi-module.h"
#include "ns3/mobility-module.h"
#include "ns3/applications-module.h"
#include "ns3/flow-monitor-module.h"

#include <iostream>
#include <iomanip>
#include <string>

using namespace ns3;

int main(int argc, char *argv[])
{
    uint32_t numberOfSources = 10;
    bool priorityEnabled = false;
    double simulationTime = 20.0;
    std::string dataRate = "2Mbps";

    CommandLine cmd(__FILE__);
    cmd.AddValue("numberOfSources", "Number of traffic sources",
                 numberOfSources);
    cmd.AddValue("priorityEnabled", "Enable ambulance priority",
                 priorityEnabled);
    cmd.AddValue("simulationTime", "Simulation duration in seconds",
                 simulationTime);
    cmd.AddValue("dataRate", "Data rate per source", dataRate);
    cmd.Parse(argc, argv);

    if (numberOfSources < 2 || numberOfSources > 10 ||
        simulationTime <= 3.0)
    {
        std::cerr << "Use 2-10 sources and simulationTime > 3 seconds."
                  << std::endl;
        return 1;
    }

    std::cout << "\n=== AMBULANCE CONGESTION SIMULATION ===\n"
              << "Sources: " << numberOfSources << '\n'
              << "Rate per source: " << dataRate << '\n'
              << "Priority: " << (priorityEnabled ? "ON" : "OFF") << '\n';

    NodeContainer nodes;
    nodes.Create(numberOfSources + 1);

    WifiHelper wifi;
    wifi.SetStandard(WIFI_STANDARD_80211g);

    YansWifiChannelHelper channel = YansWifiChannelHelper::Default();
    YansWifiPhyHelper phy;
    phy.SetChannel(channel.Create());

    WifiMacHelper mac;
    mac.SetType("ns3::AdhocWifiMac",
                "QosSupported", BooleanValue(true));

    NetDeviceContainer devices = wifi.Install(phy, mac, nodes);

    MobilityHelper mobility;
    mobility.SetMobilityModel("ns3::ConstantPositionMobilityModel");
    mobility.Install(nodes);

    for (uint32_t i = 0; i < numberOfSources; ++i)
    {
        nodes.Get(i)->GetObject<MobilityModel>()->SetPosition(
            Vector(10.0 + i * 2.0, 10.0, 0.0));
    }

    nodes.Get(numberOfSources)->GetObject<MobilityModel>()->SetPosition(
        Vector(10.0 + numberOfSources * 2.0, 10.0, 0.0));

    InternetStackHelper internet;
    internet.Install(nodes);

    Ipv4AddressHelper addresses;
    addresses.SetBase("10.1.1.0", "255.255.255.0");
    Ipv4InterfaceContainer interfaces = addresses.Assign(devices);

    const uint16_t port = 9000;

    PacketSinkHelper sinkHelper(
        "ns3::UdpSocketFactory",
        InetSocketAddress(Ipv4Address::GetAny(), port));

    ApplicationContainer sinkApps =
        sinkHelper.Install(nodes.Get(numberOfSources));

    sinkApps.Start(Seconds(1.0));
    sinkApps.Stop(Seconds(simulationTime));

    for (uint32_t i = 0; i < numberOfSources; ++i)
    {
        InetSocketAddress destination(
            interfaces.GetAddress(numberOfSources), port);

        // The first source represents the ambulance.
        // CS6 is intended to map to the high-priority Wi-Fi category.
        uint8_t tos = (priorityEnabled && i == 0) ? 0xC0 : 0x00;

        OnOffHelper client(
            "ns3::UdpSocketFactory", Address(destination));

        client.SetAttribute("DataRate",
                            DataRateValue(DataRate(dataRate)));
        client.SetAttribute("PacketSize", UintegerValue(512));
        client.SetAttribute(
            "OnTime",
            StringValue("ns3::ConstantRandomVariable[Constant=1]"));
        client.SetAttribute(
            "OffTime",
            StringValue("ns3::ConstantRandomVariable[Constant=0]"));
        client.SetAttribute("Tos", UintegerValue(tos));

        ApplicationContainer apps = client.Install(nodes.Get(i));
        apps.Start(Seconds(2.0 + i * 0.037));
        apps.Stop(Seconds(simulationTime - 1.0));

        std::cout << (i == 0 ? "Ambulance" : "Normal source")
                  << " " << i
                  << " | ToS=" << static_cast<uint32_t>(tos) << '\n';
    }

    FlowMonitorHelper flowHelper;
    Ptr<FlowMonitor> monitor = flowHelper.InstallAll();

    Simulator::Stop(Seconds(simulationTime));
    Simulator::Run();
    monitor->CheckForLostPackets();

    Ptr<Ipv4FlowClassifier> classifier =
        DynamicCast<Ipv4FlowClassifier>(flowHelper.GetClassifier());

    auto stats = monitor->GetFlowStats();

    uint64_t totalTx = 0, totalRx = 0, totalLost = 0;

    std::cout << "\n=== FLOW RESULTS ===\n";

    for (const auto &entry : stats)
    {
        const auto &s = entry.second;
        auto tuple = classifier->FindFlow(entry.first);

        double throughputKbps = 0.0;
        double delayMs = 0.0;
        double jitterMs = 0.0;

        double duration =
            (s.timeLastRxPacket - s.timeFirstTxPacket).GetSeconds();

        if (duration > 0.0)
            throughputKbps = s.rxBytes * 8.0 / duration / 1000.0;

        if (s.rxPackets > 0)
            delayMs = s.delaySum.GetSeconds() * 1000.0 / s.rxPackets;

        if (s.rxPackets > 1)
            jitterMs = s.jitterSum.GetSeconds() * 1000.0 /
                       (s.rxPackets - 1);

        std::cout << "\nFlow " << entry.first
                  << " | Source " << tuple.sourceAddress << '\n'
                  << "TX packets: " << s.txPackets
                  << " | RX packets: " << s.rxPackets
                  << " | FlowMonitor lost: " << s.lostPackets << '\n'
                  << std::fixed << std::setprecision(3)
                  << "Throughput: " << throughputKbps << " kbps"
                  << " | Delay: " << delayMs << " ms"
                  << " | Jitter: " << jitterMs << " ms\n";

        totalTx += s.txPackets;
        totalRx += s.rxPackets;
        totalLost += s.lostPackets;
    }

    std::cout << "\n=== AGGREGATE RESULTS ===\n"
              << "Priority: " << (priorityEnabled ? "ON" : "OFF") << '\n'
              << "Rate per source: " << dataRate << '\n'
              << "Total TX: " << totalTx << '\n'
              << "Total RX: " << totalRx << '\n'
              << "FlowMonitor lost count: " << totalLost << '\n';

    if (totalTx > 0)
    {
        std::cout << std::fixed << std::setprecision(2)
                  << "Delivery ratio: "
                  << 100.0 * totalRx / totalTx << "%\n";
    }

    std::string filename = priorityEnabled
        ? "ambulance-priority-enabled.xml"
        : "ambulance-priority-disabled.xml";

    monitor->SerializeToXmlFile(filename, true, true);
    std::cout << "Saved: " << filename << '\n';

    Simulator::Destroy();
    return 0;
}
