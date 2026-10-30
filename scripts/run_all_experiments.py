#!/usr/bin/env python3
"""
Automated Experiment Runner for Smart Ambulance Networking Simulation (NS-3.45).
Orchestrates all 10 experimental scenarios, collects structured CSV results,
and outputs detailed logs.
"""

import argparse
import os
import subprocess
import sys
import time
from pathlib import Path

# Paths
PYTHON_BIN = "/home/ashwini/.local/bin/python3.13"
PROJECT_DIR = Path("/home/ashwini/ambulance-ns3-project")
NS3_DIR = Path("/home/ashwini/ns3/ns-allinone-3.45/ns-3.45")
NS3_EXEC = NS3_DIR / "ns3"
RESULTS_DIR = PROJECT_DIR / "results" / "experiment_results"
CSV_DIR = RESULTS_DIR / "csv"
LOGS_DIR = RESULTS_DIR / "logs"
ANIM_DIR = PROJECT_DIR / "results" / "animation"
MASTER_CSV = CSV_DIR / "all_experiments.csv"

# Ensure directories exist
for d in (CSV_DIR, LOGS_DIR, ANIM_DIR):
    d.mkdir(parents=True, exist_ok=True)


def run_simulation(args_dict, exp_label, sim_duration=15.0):
    """
    Executes smart-ambulance-simulation with the provided arguments.
    """
    args_dict["simulationTime"] = sim_duration
    args_dict["csvOutput"] = str(MASTER_CSV)
    args_dict["expId"] = exp_label

    # Format arguments for ns3 run command
    arg_str_list = []
    for k, v in args_dict.items():
        if isinstance(v, bool):
            arg_str_list.append(f"--{k}={1 if v else 0}")
        else:
            arg_str_list.append(f"--{k}={v}")

    sim_args = " ".join(arg_str_list)
    cmd = [
        PYTHON_BIN,
        str(NS3_EXEC),
        "run",
        "--no-build",
        f"smart-ambulance-simulation {sim_args}"
    ]

    log_file = LOGS_DIR / f"{exp_label}.log"
    print(f"\n=======================================================")
    print(f"RUNNING: {exp_label}")
    print(f"Command: {' '.join(cmd)}")
    print(f"Log:     {log_file}")
    print(f"=======================================================")

    t0 = time.time()
    res = subprocess.run(
        cmd,
        cwd=str(NS3_DIR),
        capture_output=True,
        text=True,
        timeout=1200
    )
    elapsed = time.time() - t0

    output = res.stdout + "\n" + res.stderr
    log_file.write_text(output, encoding="utf-8")

    if res.returncode != 0:
        print(f"[FAILED] {exp_label} in {elapsed:.1f}s (Exit Code {res.returncode})")
        print(output[-1500:])
        return False

    print(f"[SUCCESS] {exp_label} completed in {elapsed:.1f}s")
    # Print key summary lines from simulation output
    for line in output.splitlines():
        if "Network Delivery Ratio:" in line or "Ambulance Delivery Ratio" in line or "Ambulance Average Delay:" in line:
            print("  " + line.strip())

    return True


# ===========================================================================
# Experiment Suites
# ===========================================================================

def exp1_static_vs_mobile(duration):
    """Experiment 1: Static vs Mobile Network"""
    print("\n--- EXPERIMENT 1: Static vs Mobile Network ---")
    # Static baseline
    run_simulation({
        "numAmbulances": 1,
        "numOrdinarySources": 10,
        "mobilityMode": 0, # Static
        "priorityEnabled": True,
        "ambulancePriorityMode": 2, # VO
    }, "EXP1_STATIC", sim_duration=duration)

    # Mobile network
    run_simulation({
        "numAmbulances": 1,
        "numOrdinarySources": 10,
        "mobilityMode": 1, # Random Waypoint
        "priorityEnabled": True,
        "ambulancePriorityMode": 2, # VO
    }, "EXP1_MOBILE", sim_duration=duration)


def exp2_increasing_sources(duration):
    """Experiment 2: Increasing Ordinary Traffic Sources (10, 25, 50, 75, 100)"""
    print("\n--- EXPERIMENT 2: Increasing Ordinary Traffic Sources ---")
    for sources in [10, 25, 50, 75, 100]:
        run_simulation({
            "numAmbulances": 1,
            "numOrdinarySources": sources,
            "mobilityMode": 1,
            "priorityEnabled": True,
            "ambulancePriorityMode": 2,
        }, f"EXP2_SOURCES_{sources}", sim_duration=duration)


def exp3_multiple_ambulances(duration):
    """Experiment 3: Multiple Ambulances (1, 2, 3, 5)"""
    print("\n--- EXPERIMENT 3: Multiple Ambulances ---")
    for amb in [1, 2, 3, 5]:
        run_simulation({
            "numAmbulances": amb,
            "numOrdinarySources": 50,
            "mobilityMode": 1,
            "priorityEnabled": True,
            "ambulancePriorityMode": 2,
        }, f"EXP3_AMBULANCES_{amb}", sim_duration=duration)


def exp4_emergency_priority(duration):
    """Experiment 4: Emergency Priority (OFF vs ON: BE, VI, VO) under 50 sources"""
    print("\n--- EXPERIMENT 4: Emergency Priority Verification ---")
    # Priority OFF
    run_simulation({
        "numAmbulances": 1,
        "numOrdinarySources": 50,
        "mobilityMode": 1,
        "priorityEnabled": False,
        "ambulancePriorityMode": 0,
    }, "EXP4_PRIORITY_OFF", sim_duration=duration)

    # Priority ON - BE
    run_simulation({
        "numAmbulances": 1,
        "numOrdinarySources": 50,
        "mobilityMode": 1,
        "priorityEnabled": True,
        "ambulancePriorityMode": 0,
    }, "EXP4_PRIORITY_ON_BE", sim_duration=duration)

    # Priority ON - VI
    run_simulation({
        "numAmbulances": 1,
        "numOrdinarySources": 50,
        "mobilityMode": 1,
        "priorityEnabled": True,
        "ambulancePriorityMode": 1,
    }, "EXP4_PRIORITY_ON_VI", sim_duration=duration)

    # Priority ON - VO
    run_simulation({
        "numAmbulances": 1,
        "numOrdinarySources": 50,
        "mobilityMode": 1,
        "priorityEnabled": True,
        "ambulancePriorityMode": 2,
    }, "EXP4_PRIORITY_ON_VO", sim_duration=duration)


def exp5_propagation_models(duration):
    """Experiment 5: Propagation-Loss Models (LogDistance vs Friis vs Nakagami)"""
    print("\n--- EXPERIMENT 5: Propagation-Loss Models ---")
    models = [(0, "LogDistance"), (1, "Friis"), (2, "Nakagami")]
    for model_id, model_name in models:
        run_simulation({
            "numAmbulances": 1,
            "numOrdinarySources": 50,
            "mobilityMode": 1,
            "propModel": model_id,
            "priorityEnabled": True,
            "ambulancePriorityMode": 2,
        }, f"EXP5_PROP_{model_name.upper()}", sim_duration=duration)


def exp6_phy_and_load(duration):
    """Experiment 6: Offered Traffic Load and Wireless PHY Configuration"""
    print("\n--- EXPERIMENT 6: Offered Traffic Load & PHY Modes ---")
    phy_rates = ["ErpOfdmRate6Mbps", "ErpOfdmRate24Mbps", "ErpOfdmRate54Mbps"]
    rates = ["50kbps", "100kbps", "200kbps"]

    for phy in phy_rates:
        for r in rates:
            run_simulation({
                "numAmbulances": 1,
                "numOrdinarySources": 50,
                "mobilityMode": 1,
                "phyRate": phy,
                "ordinaryDataRate": r,
                "priorityEnabled": True,
                "ambulancePriorityMode": 2,
            }, f"EXP6_{phy}_{r}", sim_duration=duration)


def exp7_random_mobility_runs(duration):
    """Experiment 7: Randomized Mobility & Reproducibility (Runs 1-5)"""
    print("\n--- EXPERIMENT 7: Randomized Mobility across Seeds ---")
    for run in range(1, 6):
        run_simulation({
            "numAmbulances": 2,
            "numOrdinarySources": 50,
            "mobilityMode": 1,
            "priorityEnabled": True,
            "ambulancePriorityMode": 2,
            "RngRun": run,
        }, f"EXP7_RUN_{run}", sim_duration=duration)


def exp8_emergency_application_messages(duration):
    """Experiment 8: Low-traffic baseline for structured emergency messages"""
    print("\n--- EXPERIMENT 8: Emergency Application Messages Baseline ---")
    run_simulation({
        "numAmbulances": 2,
        "numOrdinarySources": 2,
        "mobilityMode": 1,
        "priorityEnabled": True,
        "ambulancePriorityMode": 2,
        "enableAnim": True,
        "animFile": str(ANIM_DIR / "ambulance-emergency-demo.xml"),
    }, "EXP8_EMERGENCY_APP_MSGS", sim_duration=duration)


def exp9_congestion_stress_test(duration):
    """Experiment 9: Heavy Congestion Stress Testing (75 sources @ 250kbps)"""
    print("\n--- EXPERIMENT 9: Congestion Stress Testing ---")
    # Without Priority
    run_simulation({
        "numAmbulances": 2,
        "numOrdinarySources": 75,
        "ordinaryDataRate": "250kbps",
        "mobilityMode": 1,
        "priorityEnabled": False,
        "ambulancePriorityMode": 0,
    }, "EXP9_STRESS_NO_PRIORITY", sim_duration=duration)

    # With Priority
    run_simulation({
        "numAmbulances": 2,
        "numOrdinarySources": 75,
        "ordinaryDataRate": "250kbps",
        "mobilityMode": 1,
        "priorityEnabled": True,
        "ambulancePriorityMode": 2,
    }, "EXP9_STRESS_WITH_PRIORITY", sim_duration=duration)


def exp10_multiple_destinations(duration):
    """Experiment 10: Multiple Hospitals / Receiver Nodes"""
    print("\n--- EXPERIMENT 10: Multiple Destinations (Hospital A & Hospital B) ---")
    run_simulation({
        "numAmbulances": 2,
        "numOrdinarySources": 50,
        "numReceivers": 2, # Hospital A and Hospital B
        "mobilityMode": 1,
        "priorityEnabled": True,
        "ambulancePriorityMode": 2,
    }, "EXP10_MULTI_DESTINATIONS", sim_duration=duration)


# ===========================================================================
# Main Orchestrator
# ===========================================================================

def main():
    parser = argparse.ArgumentParser(description="Smart Ambulance NS-3 Experiment Runner")
    parser.add_argument("--all", action="store_true", help="Run all 10 experiments")
    parser.add_argument("--test-matrix", action="store_true", help="Run core test matrix covering all 10 experiments")
    parser.add_argument("--exp", type=int, choices=range(1, 11), help="Run a specific experiment (1-10)")
    parser.add_argument("--duration", type=float, default=15.0, help="Simulation duration per run (default: 15s)")
    parser.add_argument("--clean-csv", action="store_true", help="Clean existing CSV before running")
    args = parser.parse_args()

    if args.clean_csv and MASTER_CSV.exists():
        MASTER_CSV.unlink()
        print(f"Removed existing {MASTER_CSV}")

    duration = args.duration

    if args.exp:
        exp_funcs = {
            1: exp1_static_vs_mobile,
            2: exp2_increasing_sources,
            3: exp3_multiple_ambulances,
            4: exp4_emergency_priority,
            5: exp5_propagation_models,
            6: exp6_phy_and_load,
            7: exp7_random_mobility_runs,
            8: exp8_emergency_application_messages,
            9: exp9_congestion_stress_test,
            10: exp10_multiple_destinations,
        }
        exp_funcs[args.exp](duration)
    elif args.test_matrix or args.all:
        print("Starting Complete Experiment Matrix...")
        t_start = time.time()
        exp1_static_vs_mobile(duration)
        exp2_increasing_sources(duration)
        exp3_multiple_ambulances(duration)
        exp4_emergency_priority(duration)
        exp5_propagation_models(duration)
        exp6_phy_and_load(duration)
        exp7_random_mobility_runs(duration)
        exp8_emergency_application_messages(duration)
        exp9_congestion_stress_test(duration)
        exp10_multiple_destinations(duration)
        total_time = time.time() - t_start
        print(f"\n=======================================================")
        print(f"ALL EXPERIMENTS COMPLETED in {total_time/60.0:.1f} minutes")
        print(f"Results CSV: {MASTER_CSV}")
        print(f"=======================================================")
    else:
        print("Specify --test-matrix, --all, or --exp <1-10>.")
        sys.exit(1)


if __name__ == "__main__":
    main()
