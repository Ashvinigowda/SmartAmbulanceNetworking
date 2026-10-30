# Smart Ambulance Networking: Demonstration & Presentation Guide

This guide provides a step-by-step procedure to demonstrate and present the **Smart Ambulance Networking Simulation** project to evaluators, professors, or viva panels.

---

## 1. Quick Project Summary for Evaluators

> *"This project evaluates and visualizes priority-based emergency vehicular communication under heavy network congestion using NS-3.45. We modeled realistic mobile ambulances navigating toward hospital emergency centers while broadcasting continuous telemetry and emergency alerts over IEEE 802.11e EDCA multi-queue Wi-Fi. Under severe background traffic from up to 100 vehicles, standard Best-Effort traffic suffers packet loss and delays over 40 ms, while our Voice (AC_VO, TID=6) emergency prioritization achieves sub-millisecond delay (0.7–1.5 ms) and 100% packet delivery ratio."*

---

## 2. Live Demonstration Steps (Terminal Commands)

### **Step 1: Open Your WSL Ubuntu Terminal**
Navigate to the NS-3 directory:
```bash
cd ~/ns3/ns-allinone-3.45/ns-3.45
```

---

### **Step 2: Run a Single Live Simulation (With NetAnim Animation Export)**
Run this command to simulate 2 mobile ambulances, 20 background vehicles, and generate an animation XML trace:
```bash
/home/ashwini/.local/bin/python3.13 ./ns3 run --no-build 'smart-ambulance-simulation \
  --numAmbulances=2 \
  --numOrdinarySources=20 \
  --mobilityMode=1 \
  --priorityEnabled=1 \
  --ambulancePriorityMode=2 \
  --enableAnim=1 \
  --animFile=/home/ashwini/ambulance-ns3-project/results/animation/ambulance-demo.xml \
  --simulationTime=15.0'
```

**What to point out on screen:**
1. The **terminal banner** showing simulation parameters (Ambulances: 2, Sources: 20, Mobility: RandomWaypoint, Priority: VO Voice TID=6).
2. Live application logs showing `[ALERT]` and `[PREALERT]` events with **dynamically calculated ETA** and distance.
3. The **Results Summary Table** showing 100% Ambulance Delivery Ratio and sub-millisecond delay.
4. The confirmation line: `NetAnim trace saved to: results/animation/ambulance-demo.xml`.

---

### **Step 3: Launch and Show NetAnim Visual Animation**
In your Ubuntu terminal, launch NetAnim:
```bash
netanim
```
*(A graphical window will appear on your screen through Windows 11 WSLg).*

**How to show the animation in NetAnim:**
1. Click the **Folder icon (Open XML trace file)** at the top left.
2. Navigate to:
   `/home/ashwini/ambulance-ns3-project/results/animation/ambulance-network-animation.xml`
   *(or `ambulance-demo.xml`)* and click **Open**.
3. Point out the nodes on the grid canvas:
   * **Red Nodes (Node 0, Node 1)**: Mobile Emergency Ambulances.
   * **Blue Nodes (Nodes 2–21)**: Ordinary background vehicles in traffic.
   * **Green Node**: Hospital Emergency Receiving Facility.
4. Click the **Play (green triangle)** button at the top toolbar.
5. Use the **Sim Speed Slider** to adjust playback speed.
6. Show the evaluators how ambulances move dynamically across the field while green/red wireless transmission rings radiate across the airwaves.

---

### **Step 4: Prove QoS Priority Impact (Side-by-Side Comparison)**

To show the dramatic difference between Priority DISABLED vs Priority ENABLED under heavy 50-source congestion:

#### **A. Without Priority (Best Effort):**
```bash
/home/ashwini/.local/bin/python3.13 ./ns3 run --no-build 'smart-ambulance-simulation \
  --numAmbulances=1 \
  --numOrdinarySources=50 \
  --priorityEnabled=0 \
  --simulationTime=10.0'
```
*Observe higher ambulance jitter and contention with ordinary packets.*

#### **B. With Priority (Voice AC_VO, TID=6):**
```bash
/home/ashwini/.local/bin/python3.13 ./ns3 run --no-build 'smart-ambulance-simulation \
  --numAmbulances=1 \
  --numOrdinarySources=50 \
  --priorityEnabled=1 \
  --ambulancePriorityMode=2 \
  --simulationTime=10.0'
```
*Point out that Ambulance PDR is **100.00%** with delay reduced to **0.78 ms**!*

---

### **Step 5: Show the Generated Publication Graphs in Windows**
Open the generated graphs folder directly in Windows File Explorer:
```bash
cd ~/ambulance-ns3-project
explorer.exe results/experiment_results/graphs
```
Double-click and present these key graphs to your evaluators:
1. `ambulance_delay_vs_sources.png`: Shows ambulance delay staying low while network load increases.
2. `delivery_ratio_vs_sources.png`: Shows ordinary traffic delivery dropping to ~40% while ambulance delivery remains near 100%.
3. `priority_disabled_vs_enabled.png`: Clear bar chart showing delay and delivery ratio improvements under QoS.
4. `static_vs_mobile_comparison.png`: Shows how vehicle mobility affects delivery and delay.
5. `propagation_models_comparison.png`: Compares LogDistance, Friis, and Nakagami-m fading models.

---

### **Step 6: Show the Master CSV Spreadsheet**
Open the CSV directory in Windows:
```bash
explorer.exe results/experiment_results/csv
```
Open `all_experiments.csv` in **Microsoft Excel**. Show that all 30+ experimental trials are logged with exact quantitative metrics (Net PDR, Ambulance PDR, Delay, Jitter, Throughput, Valid Messages, Delivered Alerts).

---

## 3. Anticipated Questions from Evaluators & Model Answers

### **Q1: How does your application layer structure its data?**
> **Answer**: *"We designed a custom 54-byte binary serialization protocol called `AmbulanceAppHeader`. It encodes a magic identifier (`0x414D`), message type (`AMBULANCE_TELEMETRY`, `EMERGENCY_ALERT`, `HOSPITAL_PREALERT`, or `ORDINARY_TELEMETRY`), GPS coordinates (X, Y), speed, heading angle, calculated Hospital ETA in seconds, clinical severity, and resource requirement bitmasks. The receiver performs in-flight deserialization, validation checks, and gap/duplicate detection."*

### **Q2: How does NS-3 implement IEEE 802.11e QoS priority?**
> **Answer**: *"We enable QoS on `AdhocWifiMac` with `QosSupported=true`. In NS-3, packet classification into EDCA access categories is governed by `SocketPriorityTag`. We tag emergency ambulance packets with Priority TID 6, which directly maps to `AC_VO` (Voice). `AC_VO` uses smaller arbitration inter-frame spacing (AIFSN=2) and smaller contention windows (CWmin=3, CWmax=7) than Best Effort (`AC_BE`, AIFSN=3, CWmin=15, CWmax=1023), allowing ambulance transmissions to win channel contention almost immediately."*

### **Q3: Why did you use NetAnim instead of NAM?**
> **Answer**: *"Network Animator (NAM) was originally built for legacy NS-2 wired point-to-point networks and is completely deprecated in NS-3.45. NS-3 natively provides `AnimationInterface` generating structured XML traces specifically designed for **NetAnim 3.109**, which natively supports wireless channel propagation, dynamic 2D vehicular mobility vectors, and custom node color coding."*

### **Q4: How is ETA dynamically calculated?**
> **Answer**: *"Each ambulance node queries its `MobilityModel` during periodic telemetry scheduling to extract its current position vector $(x, y)$ and velocity vector $(v_x, v_y)$. It calculates Euclidean distance to the destination hospital $\sqrt{(x_h - x)^2 + (y_h - y)^2}$ and instantaneous speed $s = \sqrt{v_x^2 + v_y^2}$. The dynamic ETA is computed as $\text{distance} / s$ and embedded into the packet header."*
