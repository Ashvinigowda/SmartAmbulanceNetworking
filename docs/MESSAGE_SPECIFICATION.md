# Application Message Specification: Smart Ambulance Networking

## 1. Overview
In accordance with Section 8 and Section 9 of the project requirements, arbitrary dummy payloads, repeated character strings, and unformatted byte floods have been completely eliminated. All simulation packets carry structured, binary-serialized application information relevant to vehicular emergency communication.

Every packet incorporates a standardized 50-byte `AmbulanceAppHeader` with network byte-order (big-endian) encoding, ensuring deterministic cross-platform decoding and validation.

---

## 2. Master Message Specification Table

| Message Name | Type ID | Purpose | Key Fields | Header Size | Payload Size | Total Size | Generation Interval | Source Count | Default Destination | 802.11e Priority Class | Offered Application Rate |
| :--- | :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- | :---: | :--- |
| **`AMBULANCE_TELEMETRY`** | `1` | Periodic dynamic vehicle status, coordinates, velocity, and dynamic ETA | Magic, Version, Type, SrcNode, DstNode, AmbId, Seq, TimestampNs, PosX, PosY, Speed, Heading, TargetHospitalId, EtaSeconds | 50 B | 0 B | **50 B** | 1.0 s (1 Hz) | Configurable (1 to 5) | Hospital / Dispatch Receiver | High (`AC_VO`, TID 6) or Medium (`AC_VI`, TID 5) | $50 \times 8 \times 1 = 400$ bps per ambulance |
| **`EMERGENCY_ALERT`** | `2` | Event-triggered critical patient notification & priority route clearance | EventId, SeverityLevel (1-3), EmergencyStatus, AmbId, TimestampNs, TargetHospitalId | 50 B | 0 B | **50 B** | Event-triggered (at $t = 4.0$s, $11.0$s) | Configurable (1 to 5) | Hospital / Dispatch Receiver | Highest (`AC_VO`, TID 6) | Event-driven burst (~100 B total) |
| **`HOSPITAL_PREALERT`** | `3` | Hospital pre-arrival notification with dynamic ETA and resource reservation | TargetHospitalId, EtaSeconds, ResourceBitmask (ICU, Trauma, CT), AmbId, TimestampNs | 50 B | 0 B | **50 B** | Periodic milestone ($t = 3$s, $8$s, $15$s) | Configurable (1 to 5) | Designated Hospital Receiver | High (`AC_VO`, TID 6) | Milestone (~150 B total) |
| **`ORDINARY_TELEMETRY`** | `4` | Background vehicular and roadside infrastructure telemetry | CategoryId (1-4), SourceNodeId, Seq, TimestampNs, Category Payload Padding | 50 B | 206 B (configurable) | **256 B** | Configurable (e.g. 0.02s - 0.2s) | Configurable (10 to 150) | Common Receiver / Hospital | Best Effort (`AC_BE`, TID 0) | 100 kbps to 2 Mbps per source |

---

## 3. Ordinary Traffic Categories

Background non-emergency traffic is categorized into four realistic application types:

1. **Category 1: Roadside Environmental Telemetry (`CAT_ENVIRONMENTAL_TELEMETRY`)**
   - *Purpose*: Road surface conditions, ambient temperature, air quality, visibility sensor data.
   - *Frequency*: Staggered intervals.
2. **Category 2: Traffic Density Summary (`CAT_TRAFFIC_DENSITY_SUMMARY`)**
   - *Purpose*: RSU-aggregated vehicular counts, average segment speeds, lane congestion index.
   - *Frequency*: Periodic segment broadcasts.
3. **Category 3: Roadside Infrastructure Status (`CAT_INFRASTRUCTURE_STATUS`)**
   - *Purpose*: Traffic signal phase and timing (SPaT), intersection health, controller heartbeat.
   - *Frequency*: Periodic infrastructure reporting.
4. **Category 4: Generic Vehicle Operational Telemetry (`CAT_VEHICLE_OPERATIONAL`)**
   - *Purpose*: Normal civilian/commercial vehicle telemetry pings, cruise diagnostics.
   - *Frequency*: Continuous background flow.

---

## 4. Binary Header Field Definitions & Serialization Schema

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          Magic (0x414D)       |    Version    |    MsgType    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                         SourceNodeId                          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                          DestNodeId                           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          AmbulanceId          |          SequenceNo           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                       TxTimestampNs (64-bit)                  +
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                      Current PosX (float32)                   |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                      Current PosY (float32)                   |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                      Speed (m/s, float32)                     |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Heading (deg, float32)                     |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|       EventOrCategory         |Status/Severity|TargetHospId   |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                   Estimated Arrival Time (float32)            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|       RequiredResources       |          PayloadLen           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                   Variable Payload Padding ...                |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

### Detailed Field Breakdown:
1. **`Magic`** (16 bits): Constant `0x414D` (`'A'`, `'M'`). Packets failing this check are rejected as malformed.
2. **`Version`** (8 bits): Protocol version (currently `1`).
3. **`MsgType`** (8 bits): `1 = AMBULANCE_TELEMETRY`, `2 = EMERGENCY_ALERT`, `3 = HOSPITAL_PREALERT`, `4 = ORDINARY_TELEMETRY`.
4. **`SourceNodeId`** (32 bits): Originating NS-3 Node ID.
5. **`DestNodeId`** (32 bits): Target destination Node ID (Hospital/Dispatch).
6. **`AmbulanceId`** (16 bits): Logical ID of ambulance (`1` to `5`). `0` for ordinary traffic.
7. **`SequenceNo`** (32 bits): Monotonically increasing counter per source node.
8. **`TxTimestampNs`** (64 bits): High-resolution simulation timestamp in nanoseconds from `Simulator::Now().GetNanoSeconds()`.
9. **`PosX` & `PosY`** (32 bits each): True simulated Cartesian coordinates dynamically queried from `MobilityModel::GetPosition()`.
10. **`Speed`** (32 bits): Instantaneous speed in meters/second calculated from mobility velocity vector: $\sqrt{v_x^2 + v_y^2}$.
11. **`Heading`** (32 bits): Direction angle in degrees: $\text{atan2}(v_y, v_x) \times \frac{180}{\pi}$.
12. **`EventOrCategory`** (16 bits): Event ID for alerts, or category (1-4) for ordinary traffic.
13. **`StatusOrSeverity`** (8 bits): En-route status or emergency triage code (1 = Low, 2 = Urgent, 3 = Critical Code Red).
14. **`TargetHospitalId`** (8 bits): Designated hospital identifier (`1` = Hospital A, `2` = Hospital B).
15. **`EtaSeconds`** (32 bits): Calculated dynamic estimated time of arrival based on Euclidean distance and vehicle speed.
16. **`RequiredResources`** (16 bits): Bitmask of requested emergency equipment/teams (`0x0001` = ICU bed, `0x0002` = Trauma team standby, `0x0004` = CT scanner, `0x0008` = Operating theater).
17. **`PayloadLen`** (16 bits): Length of optional extra application payload.

---

## 5. Mathematical Models & Rate Calculations

### 5.1 Dynamic Estimated Time of Arrival (ETA)
$$\text{Distance} = \sqrt{(x_{\text{amb}} - x_{\text{hosp}})^2 + (y_{\text{amb}} - y_{\text{hosp}})^2}$$

$$\text{ETA (seconds)} = \frac{\text{Distance}}{\max(v_{\text{amb}}, 1.0 \text{ m/s})}$$
*(Note: If the vehicle is temporarily paused at a waypoint, a nominal velocity of 15.0 m/s is used as a fallback rather than dividing by zero).*

### 5.2 Application Data Rate vs Channel Capacity
For $N$ ambulances transmitting at rate $R$ (packets/second):
$$\text{Ambulance Offered Load (bps)} = N \times \text{Size (bytes)} \times 8 \times R$$

For 3 ambulances sending 1 msg/s of 50-byte telemetry:
$$\text{Offered Load} = 3 \times 50 \times 8 \times 1 = 1,200 \text{ bps (1.2 kbps)}$$

For 50 ordinary sources each sending 256-byte packets at 100 kbps:
$$\text{Aggregate Ordinary Load} = 50 \times 100 \text{ kbps} = 5,000 \text{ kbps (5.0 Mbps)}$$

This illustrates the crucial distinction between low-bandwidth, delay-critical emergency signaling and high-volume background traffic competing for Wi-Fi channel access.
