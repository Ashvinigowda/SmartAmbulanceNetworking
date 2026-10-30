# Technical Investigation: NAM vs NetAnim in NS-3.45

## 1. Executive Summary & Historical Context
In accordance with Section 17 of the project requirements, an in-depth technical investigation was conducted to determine whether NS-3.45 can generate valid traces for NAM (Network Animator), or if NAM visualization is applicable to modern IEEE 802.11 wireless ad-hoc vehicular simulations.

### Key Findings:
1. **Architectural Origin**: NAM was originally engineered in the late 1990s as a Tcl/Tk-based visualizer specifically for **NS-2 (Network Simulator 2)**. NS-2 generated NAM trace files with lines formatted like:
   `+ -t 1.000000000 -s 0 -d 1 -p tcp -e 40 -c 0 -i 0 -a 0 -x {0.0 1.0 0} ...`
2. **Deprecation in NS-3**: When NS-3 was designed from scratch as a modern C++ simulator (replacing NS-2), the NS-3 development community deprecated NAM. NS-3 introduced **NetAnim** (`AnimationInterface`) as its native, official animation architecture.
3. **Absence of Native NAM Support**: In NS-3.45, there is **no native `NamHelper` or NAM trace generator** for wireless/Wi-Fi devices (`WifiNetDevice`). An obsolete point-to-point helper in early experimental ns-3 releases only supported fixed wired links and has long been unsupported.
4. **Wireless Mobility Limitations in NAM**: NAM was designed primarily for wired topologies (nodes connected by duplex links with fixed queues). NAM does not provide adequate or realistic rendering of 802.11 wireless contention, CSMA/CA backoff, radio propagation ranges, or complex random waypoint Cartesian mobility.
5. **No File Renaming**: As strictly mandated by Section 17, NetAnim XML files are never arbitrarily renamed to `.nam`. Such files are incompatible and cause NAM to crash or report parse syntax errors.

---

## 2. Technical Comparison: NetAnim vs NAM

| Feature / Capability | NS-3 NetAnim (`AnimationInterface`) | NS-2 NAM (Network Animator) |
| :--- | :--- | :--- |
| **Supported Simulator** | Native to NS-3 (including NS-3.45) | Native to legacy NS-2 |
| **Trace Format** | Structured XML (`<anim>`, `<node>`, `<link>`, `<packet>`) | Flat text trace (`+`, `-`, `r`, `d`, `n` commands) |
| **Wireless Node Mobility** | Full dynamic 2D/3D tracking with configurable polling interval | Extremely limited / wired-centric |
| **Node Styling & Icons** | RGB color updates, node descriptions, custom sizing, icons | Fixed circle geometries and limited color indices |
| **Wi-Fi Packet Transmissions** | Real-time circular wave packet animations showing transmission radius | Only link-based edge packet flows |
| **Supported NetDevices** | `WifiNetDevice`, `PointToPointNetDevice`, `CsmaNetDevice`, `LteNetDevice` | Only wired point-to-point links |
| **Current Status** | Actively maintained by the NS-3 core consortium | Discontinued / Legacy |

---

## 3. NetAnim Implementation in Upgraded Project

To provide authentic, verified visualization:
1. The simulation is instrumented using `ns3::AnimationInterface`:
   ```cpp
   std::unique_ptr<AnimationInterface> anim = std::make_unique<AnimationInterface>("results/animation/ambulance-network-animation.xml");
   anim->SetMaxPktsPerTraceFile(500000);
   anim->SetMobilityPollInterval(Seconds(0.25));
   ```
2. Dynamic visual differentiation:
   - **Ambulances**: Highlighted in **Red** (`RGB 255, 0, 0`), enlarged size (`8.0 x 8.0`), labeled `Ambulance-1`, `Ambulance-2`, etc.
   - **Hospitals / Receivers**: Highlighted in **Green** (`RGB 0, 200, 0`), landmark size (`12.0 x 12.0`), labeled `Hospital-A`, `Hospital-B`.
   - **Ordinary Traffic**: Highlighted in **Blue** (`RGB 0, 100, 255`), normal vehicular size (`3.0 x 3.0`), labeled `Traffic-1`, `Traffic-2`, etc.
3. XML Output Validation:
   The resulting XML file contains accurate `<node>` declarations, `<meta>` records, and continuous packet reception events.
4. How to Open in NetAnim:
   On any system with the NetAnim GUI executable:
   ```bash
   netanim results/animation/ambulance-network-animation.xml
   ```
   Or inside WSL / Windows using an X11 server or Windows NetAnim binary.

---

## 4. Conclusion
NAM is an obsolete NS-2 tool incompatible with modern NS-3 wireless simulations. Implementing simulated NAM converters produces degraded, non-standard animations. **NetAnim is the verified, correct, and technically sound visualization solution for NS-3.45.**
