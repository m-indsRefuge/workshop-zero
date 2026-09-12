import copy, importlib, json, sys, unittest
from pathlib import Path
TOOL_DIR=Path(__file__).resolve().parent
sys.path.insert(0,str(TOOL_DIR))
def load_q():
    try:return importlib.import_module("qualification")
    except ModuleNotFoundError:return None
class Tests(unittest.TestCase):
    def setUp(self):
        self.q=load_q(); self.assertIsNotNone(self.q,"qualification module must exist")
    def test_frozen_cases_are_unique_and_safe(self):
        f=self.q.load_fixture(); cs=f["cases"]
        self.assertEqual(len(cs),24); self.assertEqual(len({c["id"] for c in cs}),24)
        for c in cs:self.assertEqual(self.q.find_forbidden_keys(c["observation"]),[])
    def test_repeatability_pairs_have_identical_inputs(self):
        f=self.q.load_fixture(); groups={}
        for c in f["cases"]:
            if c.get("repeatabilityGroup"):groups.setdefault(c["repeatabilityGroup"],[]).append(c)
        self.assertEqual(set(groups),{"PAIR-A","PAIR-B"})
        for pair in groups.values():
            self.assertEqual(self.q.model_input_for_case(f,pair[0]),self.q.model_input_for_case(f,pair[1]))
    def test_validator_and_scoring(self):
        good={"action":"observe_generator","predicted_generator_reading":None}
        self.assertTrue(self.q.validate_decision(good)[0])
        bad=dict(good,charge=8); self.assertFalse(self.q.validate_decision(bad)[0])
        for v in [True,-1,13,"7"]:
            d=dict(good,predicted_generator_reading=v); self.assertFalse(self.q.validate_decision(d)[0])
        c={"expectedActions":["observe_generator"],"predictionRule":"null"}
        s=self.q.score_decision(c,{"action":"observe_generator","predicted_generator_reading":9})
        self.assertTrue(s["epistemic_violation"]); self.assertFalse(s["case_pass"])
    def test_request_contract(self):
        f=self.q.load_fixture(); r=self.q.build_request("phi4-mini:3.8b-q4_K_M",f,f["cases"][0])
        self.assertFalse(r["stream"]); self.assertFalse(r["think"]); self.assertEqual(r["format"],self.q.DECISION_SCHEMA)
        self.assertEqual(r["options"],{"temperature":0,"seed":42,"num_ctx":4096,"num_predict":96})
        p=json.loads(r["messages"][1]["content"]); self.assertNotIn("case_id",p)
    def test_no_retry_on_transport_failure(self):
        f=self.q.load_fixture(); calls={"n":0}
        def fail(path,payload):calls["n"]+=1; raise TimeoutError("synthetic")
        e=self.q.run_case({"name":"phi4-mini:3.8b-q4_K_M","digest":"78fad5d182a7full"},f,f["cases"][0],fail)
        self.assertEqual(calls["n"],1); self.assertEqual(e["state"],"PROVIDER_ERROR"); self.assertEqual(e["attempt_count"],1)
    def test_digest_preflight(self):
        models=[]
        for name,digest,size in [("phi4-mini:3.8b-q4_K_M","78fad5d182a7abc",2500),("qwen3:8b","500a1f067a9fabc",5200),("ministral-3:8b","1922accd5827abc",6000)]:
            models.append({"name":name,"digest":digest,"size":size,"details":{"parameter_size":"x","quantization_level":"Q4_K_M"}})
        self.assertEqual(len(self.q.validate_candidate_models({"models":models})),3)
        broken=copy.deepcopy(models); broken[0]["digest"]="deadbeef"
        with self.assertRaises(ValueError):self.q.validate_candidate_models({"models":broken})
    def test_recommend_smallest_qualified(self):
        s=[{"model":"small","size_bytes":2500,"qualified":True,"case_pass_count":22,"median_total_duration_ms":1000},{"model":"large","size_bytes":5200,"qualified":True,"case_pass_count":24,"median_total_duration_ms":700}]
        self.assertEqual(self.q.select_recommendation(s),"small")
    def test_canonical_hash_stable(self):
        self.assertEqual(self.q.canonical_sha256({"a":1,"b":2}),self.q.canonical_sha256({"b":2,"a":1}))
if __name__=="__main__":unittest.main()