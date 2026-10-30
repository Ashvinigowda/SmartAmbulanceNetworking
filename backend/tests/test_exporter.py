import unittest
from pathlib import Path
import sys

# Ensure repository root is in sys.path
repo_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(repo_root))

from backend.exporter import SimulationExporter


class TestSimulationExporter(unittest.TestCase):
    def setUp(self):
        self.exporter = SimulationExporter(project_root=str(repo_root))

    def test_get_all_simulations(self):
        sims = self.exporter.get_all_simulations()
        self.assertGreater(len(sims), 0, "Should load simulations from CSV")
        
        # Verify first simulation structure
        s0 = sims[0]
        self.assertIn("id", s0)
        self.assertIn("exp_id", s0)
        self.assertIn("config", s0)
        self.assertIn("network_metrics", s0)
        self.assertIn("ambulance_metrics", s0)
        self.assertIn("app_metrics", s0)

    def test_get_simulation_by_id(self):
        sims = self.exporter.get_all_simulations()
        first_id = sims[0]["id"]
        found = self.exporter.get_simulation_by_id(first_id)
        self.assertIsNotNone(found)
        self.assertEqual(found["id"], first_id)

        # Test non-existent ID
        missing = self.exporter.get_simulation_by_id("non_existent_id_999")
        self.assertIsNone(missing)

    def test_get_simulation_topology(self):
        sims = self.exporter.get_all_simulations()
        sim_id = sims[0]["id"]
        topo = self.exporter.get_simulation_topology(sim_id)
        
        self.assertIn("nodes", topo)
        self.assertIn("links", topo)
        self.assertIn("bounds", topo)
        self.assertGreater(len(topo["nodes"]), 0)

        # Ensure node types are classified accurately
        types = {n["type"] for n in topo["nodes"]}
        self.assertTrue("ambulance" in types or "ordinary" in types)

    def test_get_simulation_events(self):
        sims = self.exporter.get_all_simulations()
        sim_id = sims[1]["id"] # Mobile simulation
        events_data = self.exporter.get_simulation_events(sim_id, limit=10, offset=0)
        
        self.assertIn("events", events_data)
        self.assertIn("total_events", events_data)
        self.assertIn("nodes", events_data)
        self.assertIn("trajectories", events_data)
        self.assertLessEqual(len(events_data["events"]), 10)

    def test_compare_scenarios_stress_test(self):
        # Compare EXP9_STRESS_NO_PRIORITY vs EXP9_STRESS_WITH_PRIORITY
        comp = self.exporter.compare_scenarios()
        self.assertIn("baseline", comp)
        self.assertIn("proposed", comp)
        self.assertIn("comparison", comp)
        
        # Priority should produce a substantial delay reduction
        delay_reduction = comp["comparison"]["delay_reduction_percent"]
        self.assertGreater(delay_reduction, 50.0, "Voice AC_VO should reduce delay significantly")

    def test_metric_calculations_defensive(self):
        # Ensure that delay and PDR numbers are within valid ranges
        for sim in self.exporter.get_all_simulations():
            pdr = sim["ambulance_metrics"]["pdr_percent"]
            self.assertGreaterEqual(pdr, 0.0)
            self.assertLessEqual(pdr, 100.0)
            
            delay = sim["ambulance_metrics"]["avg_delay_ms"]
            self.assertGreaterEqual(delay, 0.0)


if __name__ == "__main__":
    unittest.main()
