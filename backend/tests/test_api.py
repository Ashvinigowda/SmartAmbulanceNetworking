import unittest
from pathlib import Path
import sys
import json

repo_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(repo_root))

from backend.app import app


class TestAPIEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.client.testing = True

    def test_health_endpoint(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["ns3_version"], "3.45")
        self.assertIn("system", data)
        self.assertIn("memory_available_mb", data["system"])

    def test_simulations_list(self):
        res = self.client.get("/api/simulations")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("count", data)
        self.assertGreater(data["count"], 0)
        self.assertIn("simulations", data)

    def test_simulation_detail_and_status(self):
        sims_res = self.client.get("/api/simulations")
        sims = sims_res.get_json()["simulations"]
        first_id = sims[0]["id"]

        # Detail
        detail_res = self.client.get(f"/api/simulations/{first_id}")
        self.assertEqual(detail_res.status_code, 200)
        self.assertEqual(detail_res.get_json()["id"], first_id)

        # Status
        status_res = self.client.get(f"/api/simulations/{first_id}/status")
        self.assertEqual(status_res.status_code, 200)
        self.assertEqual(status_res.get_json()["status"], "COMPLETED")

    def test_simulation_topology(self):
        sims_res = self.client.get("/api/simulations")
        first_id = sims_res.get_json()["simulations"][0]["id"]

        res = self.client.get(f"/api/simulations/{first_id}/topology")
        self.assertEqual(res.status_code, 200)
        topo = res.get_json()
        self.assertIn("nodes", topo)
        self.assertIn("bounds", topo)
        self.assertGreater(len(topo["nodes"]), 0)

    def test_simulation_events_pagination(self):
        sims_res = self.client.get("/api/simulations")
        first_id = sims_res.get_json()["simulations"][0]["id"]

        res = self.client.get(f"/api/simulations/{first_id}/events?limit=5&offset=0")
        self.assertEqual(res.status_code, 200)
        events_data = res.get_json()
        self.assertIn("events", events_data)
        self.assertLessEqual(len(events_data["events"]), 5)

    def test_compare_endpoint(self):
        res = self.client.get("/api/compare")
        self.assertEqual(res.status_code, 200)
        comp = res.get_json()
        self.assertIn("baseline", comp)
        self.assertIn("proposed", comp)
        self.assertIn("comparison", comp)
        self.assertIn("delay_reduction_percent", comp["comparison"])

    def test_scenario_matrix(self):
        res = self.client.get("/api/scenarios/matrix")
        self.assertEqual(res.status_code, 200)
        matrix = res.get_json()
        self.assertIn("suites", matrix)
        self.assertIn("suite_2_congestion", matrix["suites"])

    def test_runner_validation(self):
        # Valid payload
        valid_payload = {
            "numAmbulances": 2,
            "numOrdinarySources": 20,
            "simulationTime": 10.0,
            "priorityEnabled": True,
            "ambulancePriorityMode": 2
        }
        res = self.client.post("/api/simulations/run", json=valid_payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("command", data)
        self.assertIn("smart-ambulance-simulation", data["command"])

        # Invalid payload (out of range ambulances)
        invalid_payload = {"numAmbulances": 50}
        res_inv = self.client.post("/api/simulations/run", json=invalid_payload)
        self.assertEqual(res_inv.status_code, 400)

    def test_reports_export(self):
        sims_res = self.client.get("/api/simulations")
        first_id = sims_res.get_json()["simulations"][0]["id"]

        # CSV export
        csv_res = self.client.get(f"/api/reports/{first_id}/export?format=csv")
        self.assertEqual(csv_res.status_code, 200)
        self.assertIn("text/csv", csv_res.content_type)
        self.assertIn("Simulation ID", csv_res.data.decode("utf-8"))

        # Summary report
        summary_res = self.client.get(f"/api/reports/{first_id}/summary")
        self.assertEqual(summary_res.status_code, 200)
        self.assertIn("Smart Ambulance Networking Simulation Report", summary_res.data.decode("utf-8"))

    def test_frontend_serving(self):
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        # Should return index.html
        self.assertIn("Smart Ambulance Networking", res.data.decode("utf-8"))


if __name__ == "__main__":
    unittest.main()
