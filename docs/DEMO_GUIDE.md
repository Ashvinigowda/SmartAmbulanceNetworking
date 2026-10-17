# Teacher Demonstration Guide

## 1. Open the NS-3.45 directory

cd ~/ns3/ns-allinone-3.45/ns-3.45

## 2. Build the simulation programs

/home/ashwini/.local/bin/python3.13 ./ns3 build ambulance-congestion -j 1
/home/ashwini/.local/bin/python3.13 ./ns3 build ambulance-fairness -j 1

## 3. Run without ambulance priority

/home/ashwini/.local/bin/python3.13 ./ns3 run "ambulance-congestion --numberOfSources=10 --dataRate=2Mbps --priorityEnabled=0 --RngRun=1"

## 4. Run with ambulance priority

/home/ashwini/.local/bin/python3.13 ./ns3 run "ambulance-congestion --numberOfSources=10 --dataRate=2Mbps --priorityEnabled=1 --RngRun=1"

## 5. Compare access categories

Mode 0 = BE (Best Effort)
/home/ashwini/.local/bin/python3.13 ./ns3 run "ambulance-fairness --numberOfSources=10 --dataRate=2Mbps --ambulanceMode=0 --RngRun=1"

Mode 1 = VI (Video)
/home/ashwini/.local/bin/python3.13 ./ns3 run "ambulance-fairness --numberOfSources=10 --dataRate=2Mbps --ambulanceMode=1 --RngRun=1"

Mode 2 = VO (Voice)
/home/ashwini/.local/bin/python3.13 ./ns3 run "ambulance-fairness --numberOfSources=10 --dataRate=2Mbps --ambulanceMode=2 --RngRun=1"

## 6. Open the saved graphs

explorer.exe "$(wslpath -w experiment_results/graphs)"

## 7. Inspect saved results

head -6 experiment_results/load_summary.csv
head -6 experiment_results/fairness_modes_summary.csv
head -6 experiment_results/fairness_summary.csv
find experiment_results -maxdepth 3 -type f | sort

Note: Run simulation commands from the NS-3.45 directory, not this package directory.
