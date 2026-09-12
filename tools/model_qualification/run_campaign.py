from __future__ import annotations
import argparse, datetime as dt, json, sys
from pathlib import Path
from qualification import *
ROOT=Path(__file__).resolve().parents[2]; EROOT=ROOT/"evidence"/"model-qualification-v0"
def write_json(p,v):p.parent.mkdir(parents=True,exist_ok=True); p.write_text(json.dumps(v,indent=2,sort_keys=True,ensure_ascii=True)+"\n",encoding="utf-8")
def preflight():
    ver=get_json("/api/version"); meta=validate_candidate_models(get_json("/api/tags")); f=load_fixture()
    if len(f["cases"])!=24:raise RuntimeError("frozen case count must be 24")
    return ver,meta,f
def show_preflight(ver,meta,f):
    print("WORKSHOP MODEL QUALIFICATION V0 - PREFLIGHT"); print("Ollama version:",ver.get("version","unknown")); print("Cases:",len(f["cases"])); print("Candidates:")
    for m in meta:print(f"  {m['name']} | {m['digest'][:12]} | {m['parameter_size']} | {m['quantization_level']}")
    print("Inference calls during preflight: 0")
def execute(ver,meta,f):
    stamp=dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ"); cid="workshop-model-qualification-v0-"+stamp; cdir=EROOT/cid
    if cdir.exists():raise RuntimeError("campaign directory already exists")
    cdir.mkdir(parents=True)
    manifest={"campaign_id":cid,"campaign_version":"workshop-model-qualification-v0","created_at_utc":stamp,"git_head":git_head(),"ollama_base_url":OLLAMA_BASE_URL,"ollama_version":ver.get("version"),"fixture_path":"tools/model_qualification/fixtures-v0.json","fixture_sha256":file_sha256(FIXTURE_PATH),"case_set_version":f["caseSetVersion"],"case_count":len(f["cases"]),"candidate_count":len(meta),"expected_inference_requests":len(f["cases"])*len(meta),"candidates":meta,"system_prompt":SYSTEM_PROMPT,"decision_schema":DECISION_SCHEMA,"request_options":REQUEST_OPTIONS,"stream":False,"think":False,"retry_policy":"zero_retries","qualification_threshold":{"provider_errors":0,"schema_valid":"24/24","epistemic_violations":0,"minimum_case_passes":MIN_CASE_PASSES},"recommendation_policy":"smallest stored model size among qualified models"}
    manifest["manifest_sha256"]=canonical_sha256(manifest); write_json(cdir/"manifest.json",manifest)
    sums=[]
    for m in meta:
        print("\n"+"="*72+f"\nMODEL: {m['name']}\n"+"="*72); ev=[]; mdir=cdir/safe_slug(m["name"])
        for i,c in enumerate(f["cases"],1):
            print(f"[{i:02d}/24] {c['id']} {c['category']} ... ",end="",flush=True); item=run_case(m,f,c); ev.append(item); write_json(mdir/(c["id"]+".json"),item)
            print("PROVIDER_ERROR" if item["state"]=="PROVIDER_ERROR" else ("PASS" if item.get("score",{}).get("case_pass") else "FAIL"))
        s=summarize_model(m,f["cases"],ev); sums.append(s); write_json(mdir/"summary.json",s)
    final={"campaign_id":cid,"manifest_sha256":manifest["manifest_sha256"],"models":sums,"quality_leader":select_quality_leader(sums),"recommended_model":select_recommendation(sums),"recommendation_policy":"smallest stored model size among qualified models","campaign_complete":True,"actual_inference_requests":len(f["cases"])*len(meta),"retries":0}
    final["summary_sha256"]=canonical_sha256(final); write_json(cdir/"summary.json",final)
    print("\n"+"="*72+"\nWORKSHOP MODEL QUALIFICATION V0 - COMPLETE\n"+"="*72)
    for s in sums:print(f"{s['model']}: {s['case_pass_count']}/24 cases, schema {s['schema_valid_count']}/24, epistemic violations {s['epistemic_violation_count']}, qualified={s['qualified']}")
    print("Quality leader:",final["quality_leader"]); print("Smallest qualified recommendation:",final["recommended_model"]); print("Evidence:",cdir); print("Manifest SHA-256:",manifest["manifest_sha256"]); print("Summary SHA-256:",final["summary_sha256"])
def main():
    p=argparse.ArgumentParser(); g=p.add_mutually_exclusive_group(required=True); g.add_argument("--preflight",action="store_true"); g.add_argument("--execute",action="store_true"); a=p.parse_args()
    try:
        ver,meta,f=preflight(); show_preflight(ver,meta,f)
        if a.execute:print("\nExecuting exactly 72 local inference requests. Retries: 0"); execute(ver,meta,f)
    except Exception as e:print(f"QUALIFICATION STOPPED: {type(e).__name__}: {e}",file=sys.stderr); return 1
    return 0
if __name__=="__main__":raise SystemExit(main())