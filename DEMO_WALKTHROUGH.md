# Smart Ambulance Networking — Complete Demonstration Walkthrough Guide
**For College Major Project Viva, Project Reviews, and Technical Interviews**

---

## 1. Executive Talking Points (30-Second Elevator Pitch)
> *"In emergency vehicular networks, ambulances transmitting critical telemetry (vital signs, GPS, dynamic hospital arrival ETA) must compete against heavy background traffic on shared 802.11 wireless channels. Under standard Best-Effort transmission, high congestion causes severe buffering delays, jitter, and packet loss.*
> 
> *Our project implements and evaluates **IEEE 802.11e EDCA Quality of Service (QoS) prioritization** in **NS-3.45**, mapping emergency telemetry to the **Voice Access Category (`AC_VO`, TID 6)** with a custom 54-byte serialized binary header (`AmbulanceAppHeader`).*
> 
> *To eliminate the heavy disk and memory footprint of legacy NetAnim, we developed this **interactive, browser-based Network Operations Center (NOC) dashboard** that directly visualizes the genuine NS-3 simulation traces, topology, and FlowMonitor performance measurements."*

---

## 2. Step-by-Step 8-Stage Demonstration Script

### Stage 1: The Executive Overview (`Overview` Tab)
* **What to show**:
  - The live Network Operations Centre status pill (`NOC ONLINE`).
  - Active scenario selector in the top-right navbar.
  - Entity inventory: **1 Ambulance**, **50 Background Traffic Nodes**, **1 Hospital Facility**.
* **What to say**:
  > *"Here on the Overview dashboard, we see the real-time KPIs parsed directly from our NS-3 simulation output. Under 50 competing background vehicular sources, our emergency ambulance maintains a **100.00% Packet Delivery Ratio** and **0.782 ms end-to-end latency**, compared to the background network delivery which degrades to 62.49%. In Section 3, all 50,000+ custom application packets were decoded with zero malformed messages."*

---

### Stage 2: Interactive 2D Network Topology (`Network Topology` Tab)
* **What to show**:
  - The 2D SVG canvas displaying the nodes.
  - Red nodes: Ambulances; Blue nodes: Ordinary vehicles; Green node: Hospital facility.
  - Click on **Ambulance-1** to open the **Node Telemetry Inspector** drawer on the right.
  - Show the live coordinates (X, Y), IP address (`10.1.0.1`), EDCA Category (`AC_VO`, TID 6), dynamic heading (45°), and computed Hospital ETA (18.4s).
  - Use the Zoom In/Out and Fit Screen buttons.
* **What to say**:
  > *"Instead of relying on NetAnim, our dashboard renders the actual spatial node coordinates directly from NS-3. Clicking any node inspects its wireless network layer: Ambulance 1 is bound to socket priority TID 6 (AC_VO), with dynamic mobility tracking its heading vector and calculating real-time hospital ETA in seconds."*

---

### Stage 3: Packet Flow Replay (`Packet Replay` Tab) — **The Visual Highlight!**
* **What to show**:
  - When you navigate to this tab, click the **big glowing red Play button** in the center of the canvas!
  - Watch Ambulance-1 (Red) and ordinary vehicles (Blue) navigate dynamically across the terrain!
  - Point out the **animated packet pulses** flying from the ambulance to Hospital-A along the dashed transmission path.
  - Point out the **Live Packet Log Stream** on the right side scrolling with real timestamps (`t=1.357s`, `t=2.350s`), decoded message types (`EMERGENCY_ALERT`), and latency (e.g. `0.78ms`).
  - Show the playback speed controls (0.25x, 0.5x, 1x, 2x, 5x) and timeline scrubber.
* **What to say**:
  > *"This is our lightweight in-browser replay engine. It decodes the genuine NS-3 wireless transmission `<pr>` and reception `<wpr>` events from the trace file. Notice how the red ambulance continuously transmits priority alerts while in motion toward the green hospital node, achieving sub-millisecond reception latency even as background vehicles compete for the channel."*

---

### Stage 4: Priority QoS Architecture (`Priority QoS (EDCA)` Tab)
* **What to show**:
  - The EDCA Multi-Queue parameters comparison table:
    - `AC_VO` (Voice, TID 6): AIFSN = 2, CWmin = 3, CWmax = 7
    - `AC_BE` (Best Effort, TID 0): AIFSN = 3, CWmin = 15, CWmax = 1023
  - The C++ source code snippet showing `SocketPriorityTag` and `AdhocWifiMac` `QosSupported(true)`.
  - The 54-byte `AmbulanceAppHeader` binary structure diagram (Magic `0x414D`, Seq, GPS X/Y, Speed, Heading, Severity, ETA, Resource Bitmask).
* **What to say**:
  > *"Priority in our simulation is not a superficial frontend label; it is enforced at the MAC layer through IEEE 802.11e EDCA. Emergency packets are tagged with TID 6 (Voice), which grants them an Arbitration Inter-Frame Space Number (AIFSN) of 2 and a Contention Window of only 3 to 7 slots, compared to Best Effort which must back off between 15 and 1,023 slots. Furthermore, our custom 54-byte serialized header provides in-flight decoding of clinical trauma requirements and dynamic hospital ETA."*

---

### Stage 5: Congestion & Latency Analysis (`Congestion Analysis` Tab)
* **What to show**:
  - The **Packet Delivery Ratio (PDR) vs Competing Sources** curve. Show that as ordinary sources scale from 10 to 100, background network delivery drops from 68.5% down to 41.3%, but Ambulance PDR stays above 91.67% (100% up to 75 sources).
  - The **End-to-End Latency Area Chart** showing mean ambulance delay staying below 1.5 ms.
  - The **Delay Histogram Distribution** showing that the vast majority of prioritized packets are delivered in the 0-1 ms bin.
* **What to say**:
  > *"This chart demonstrates the core contribution of our work: as background vehicular traffic creates severe channel congestion, standard unprioritized traffic collapses due to buffer overflow and collisions. In contrast, our EDCA voice queue successfully insulates emergency ambulance communication."*

---

### Stage 6: Scenario Comparison (`Scenario Comparison` Tab) — **The Conclusive Proof!**
* **What to show**:
  - Select **Baseline (`EXP9_STRESS_NO_PRIORITY`)** vs **Proposed (`EXP9_STRESS_WITH_PRIORITY`)**.
  - Highlight the key metric card: **Latency Reduction: -98.0%**!
  - Show the latency chart: Baseline latency is **41.284 ms**, while Proposed emergency latency is **0.833 ms**!
  - Point to the Quantitative Summary Table.
* **What to say**:
  > *"Under extreme stress (75 background sources transmitting at 250 kbps), Best-Effort ambulance communication experiences severe queue starvation with an average delay of 41.28 ms. By activating Voice EDCA prioritization, the delay drops to 0.83 ms — a verifiable **98.0% reduction in latency**."*

---

### Stage 7: Simulation Runner & Launcher (`Simulation Runner` Tab)
* **What to show**:
  - Configure the parameters: e.g. 2 Ambulances, 25 Sources, QoS Priority ENABLED, Random Waypoint Mobility.
  - Click **"Validate & Execute Simulation"**.
  - Watch the live 4-step progress sequence (`Validating...`, `Configuring MAC...`, `Executing...`, `Aggregating FlowMonitor...`).
  - Show the live **NS-3 Simulation Console Output (stdout)** terminal box.
  - Show the completion cards (PDR: 100%, Delay: 0.902 ms, Alerts: Delivered).
  - Click **"Watch in Packet Replay Engine"** to transition smoothly back to the animated view!
* **What to say**:
  > *"Our runner provides a safe execution workflow with strict input validation to prevent arbitrary shell commands. It validates parameters against our predefined NS-3 model, displays the formatted FlowMonitor stdout stream, and immediately allows transitioning to the replay engine."*

---

### Stage 8: Results & Data Export (`Results & Reports` Tab)
* **What to show**:
  - The comprehensive table containing all 33 benchmark runs.
  - Filter by QoS mode (`Priority ON` vs `Priority OFF`).
  - Demonstrate one-click download of:
    - **CSV Export**: `sim_006_EXP2_SOURCES_50_metrics.csv`
    - **JSON Export**: `sim_006_EXP2_SOURCES_50_metrics.json`
    - **Technical Summary Report**: Markdown technical documentation.
* **What to say**:
  > *"All experimental results can be audited and exported in CSV, JSON, or downloadable technical summary reports for publication and reproducibility."*

---

## 3. Frequently Asked Faculty Questions & Model Answers

### Q1: "Why did you build a web visualizer instead of just using NetAnim?"
> **Answer**: *"NetAnim is a legacy Qt/C++ tool designed primarily for desktop offline playback. It requires significant disk space, external graphics libraries, and cannot be easily integrated into a modern web-based monitoring interface. Our browser platform parses the exact same NetAnim XML traces into lightweight, responsive SVG elements with 60 FPS animation, requiring zero NetAnim installation while consuming less than 150 MB of RAM."*

### Q2: "Does the frontend simulate the packets, or is this real NS-3 data?"
> **Answer**: *"Every measurement displayed on this dashboard comes directly from NS-3.45. The metrics are generated by FlowMonitor (`results/xml/*.xml`) and recorded in our benchmark dataset (`all_experiments.csv`). The packet replay events are decoded directly from NetAnim XML transmission `<pr>` and reception `<wpr>` tags. No fake metrics are fabricated."*

### Q3: "How does the MAC layer know a packet is an emergency packet?"
> **Answer**: *"In our C++ application layer, when creating emergency telemetry and alerts, we attach an NS-3 `SocketPriorityTag` with Priority 6 (Voice). The underlying `AdhocWifiMac` with `QosSupported=true` inspects this tag and routes the packet to the high-priority EDCA queue (`AC_VO`). This queue has a smaller contention window (CWmin=3, CWmax=7) and shorter AIFSN (2 slots), giving it mathematical priority during channel arbitration."*

### Q4: "What happens if there are multiple ambulances competing with each other?"
> **Answer**: *"We evaluated this in Experiment Suite 3 (Multi-Ambulance Scalability with 1, 2, 3, and 5 concurrent ambulances). When multiple ambulances transmit, they share the `AC_VO` access category. Because their data rates are compact (1 Hz telemetry and event-driven alerts), channel contention between ambulances remains low, and all emergency alerts were delivered with 100% success across all tests."*
