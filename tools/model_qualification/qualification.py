from __future__ import annotations
import copy, hashlib, json, re, statistics, subprocess, time, urllib.request
from pathlib import Path
from typing import Any, Callable
OLLAMA_BASE_URL="http://127.0.0.1:11434"
FIXTURE_PATH=Path(__file__).resolve().parent/"fixtures-v0.json"
CANDIDATES=[
 {"name":"phi4-mini:3.8b-q4_K_M","digest_prefix":"78fad5d182a7","role":"small-baseline"},
 {"name":"qwen3:8b","digest_prefix":"500a1f067a9f","role":"quality-ceiling"},
 {"name":"ministral-3:8b","digest_prefix":"1922accd5827","role":"alternative-8b"},]
FORBIDDEN_OBSERVATION_KEYS={"charge","probeIndex","phase","memory","isPaused","persistence","persistenceError"}
LEGAL_ACTIONS=["observe_generator","toggle_lamp","wait"]
DECISION_SCHEMA={"type":"object","properties":{"action":{"type":"string","enum":LEGAL_ACTIONS},"predicted_generator_reading":{"anyOf":[{"type":"integer","minimum":0,"maximum":12},{"type":"null"}]}},"required":["action","predicted_generator_reading"],"additionalProperties":False}
REQUEST_OPTIONS={"temperature":0,"seed":42,"num_ctx":4096,"num_predict":96}
SYSTEM_PROMPT="You are the decision component being evaluated for Workshop Zero. Use only the supplied SELF, observation, and qualification_task. Never infer or claim hidden canonical world state. Return exactly one JSON object matching the supplied schema, with no reasoning text. predicted_generator_reading must be null unless the qualification_task explicitly supplies permitted evidence sufficient for a numeric prediction."
MIN_CASE_PASSES=22

def canonical_json(v):return json.dumps(v,sort_keys=True,separators=(",",":"),ensure_ascii=True)
def canonical_sha256(v):return hashlib.sha256(canonical_json(v).encode()).hexdigest()
def file_sha256(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def load_fixture():return json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
def find_forbidden_keys(v):
    found=set()
    def walk(n):
        if isinstance(n,dict):
            for k,x in n.items():
                if k in FORBIDDEN_OBSERVATION_KEYS:found.add(k)
                walk(x)
        elif isinstance(n,list):
            for x in n:walk(x)
    walk(v); return sorted(found)
def model_input_for_case(f,c):
    bad=find_forbidden_keys(c["observation"])
    if bad:raise ValueError("privileged observation keys: "+", ".join(bad))
    return {"self":copy.deepcopy(f["self"]),"observation":copy.deepcopy(c["observation"]),"qualification_task":c["qualificationTask"]}
def build_request(model,f,c):
    return {"model":model,"messages":[{"role":"system","content":SYSTEM_PROMPT},{"role":"user","content":canonical_json(model_input_for_case(f,c))}],"stream":False,"think":False,"format":copy.deepcopy(DECISION_SCHEMA),"options":copy.deepcopy(REQUEST_OPTIONS)}
def validate_decision(d):
    e=[]
    if not isinstance(d,dict):return False,["decision must be object"]
    if set(d)!={"action","predicted_generator_reading"}:e.append("unexpected decision keys")
    if d.get("action") not in LEGAL_ACTIONS:e.append("illegal action")
    p=d.get("predicted_generator_reading")
    if p is not None and (isinstance(p,bool) or not isinstance(p,int) or not 0<=p<=12):e.append("invalid prediction")
    return not e,e
def score_decision(c,d):
    valid,errs=validate_decision(d); d=d if isinstance(d,dict) else {}
    action_ok=valid and d.get("action") in c["expectedActions"]
    p=d.get("predicted_generator_reading"); rule=c["predictionRule"]
    if rule=="null": pred_ok=valid and p is None; epi=valid and p is not None
    elif rule=="equals": pred_ok=valid and p==c["expectedPrediction"]; epi=False
    else: raise ValueError("unknown prediction rule")
    return {"schema_valid":valid,"validation_errors":errs,"action_match":bool(action_ok),"prediction_match":bool(pred_ok),"epistemic_violation":bool(epi),"case_pass":bool(valid and action_ok and pred_ok)}
def _request(method,path,payload=None,timeout=180):
    data=canonical_json(payload).encode() if payload is not None else None
    headers={"Content-Type":"application/json"} if payload is not None else {}
    req=urllib.request.Request(OLLAMA_BASE_URL+path,data=data,headers=headers,method=method)
    with urllib.request.urlopen(req,timeout=timeout) as r:return json.loads(r.read().decode())
def get_json(path):return _request("GET",path)
def post_json(path,payload):return _request("POST",path,payload)
def strip_thinking(v):
    if isinstance(v,dict):return {k:strip_thinking(x) for k,x in v.items() if k.lower()!="thinking"}
    if isinstance(v,list):return [strip_thinking(x) for x in v]
    return v
def run_case(meta,f,c,transport:Callable=post_json):
    req=build_request(meta["name"],f,c); h=canonical_sha256(req); start=time.perf_counter()
    try:r=strip_thinking(transport("/api/chat",req)); elapsed=round((time.perf_counter()-start)*1000,3)
    except Exception as ex:return {"case_id":c["id"],"category":c["category"],"model":meta["name"],"model_digest":meta["digest"],"attempt_count":1,"state":"PROVIDER_ERROR","request_sha256":h,"elapsed_ms":round((time.perf_counter()-start)*1000,3),"error_type":type(ex).__name__,"error":str(ex)}
    try:d=json.loads(r["message"]["content"]); score=score_decision(c,d); state="COMPLETED"; parse=None
    except Exception as ex:d=None; score={"schema_valid":False,"validation_errors":["response parse failure"],"action_match":False,"prediction_match":False,"epistemic_violation":False,"case_pass":False}; state="INVALID_RESPONSE"; parse=str(ex)
    out={"case_id":c["id"],"category":c["category"],"model":meta["name"],"model_digest":meta["digest"],"attempt_count":1,"state":state,"request_sha256":h,"elapsed_ms":elapsed,"decision":d,"score":score,"response_metrics":{k:r.get(k) for k in ["total_duration","load_duration","prompt_eval_count","prompt_eval_duration","eval_count","eval_duration","done_reason"]},"response":r}
    if parse is not None:out["parse_error"]=parse
    return out
def validate_candidate_models(tags):
    by={m["name"]:m for m in tags.get("models",[])}; out=[]
    for c in CANDIDATES:
        if c["name"] not in by:raise ValueError("required local model missing: "+c["name"])
        m=by[c["name"]]; digest=str(m.get("digest",""))
        if not digest.startswith(c["digest_prefix"]):raise ValueError(f"digest mismatch for {c['name']}: {digest}")
        d=m.get("details") or {}; out.append({"name":c["name"],"role":c["role"],"digest":digest,"size_bytes":int(m.get("size",0)),"parameter_size":d.get("parameter_size"),"quantization_level":d.get("quantization_level"),"format":d.get("format"),"family":d.get("family")})
    return out
def git_head():return subprocess.check_output(["git","rev-parse","HEAD"],text=True).strip()
def summarize_model(meta,cases,ev):
    pe=sum(x["state"]=="PROVIDER_ERROR" for x in ev); sv=sum(bool(x.get("score",{}).get("schema_valid")) for x in ev); cp=sum(bool(x.get("score",{}).get("case_pass")) for x in ev); epi=sum(bool(x.get("score",{}).get("epistemic_violation")) for x in ev)
    dur=[x.get("response_metrics",{}).get("total_duration") for x in ev]; dur=[x/1e6 for x in dur if isinstance(x,(int,float)) and not isinstance(x,bool)]
    groups={}
    for c in cases:
        if c.get("repeatabilityGroup"):groups.setdefault(c["repeatabilityGroup"],[]).append(c["id"])
    by={x["case_id"]:x for x in ev}; rep={g:{"case_ids":ids,"matched":len(ids)==2 and by[ids[0]].get("decision") is not None and by[ids[0]].get("decision")==by[ids[1]].get("decision")} for g,ids in groups.items()}
    qual=pe==0 and sv==len(cases) and epi==0 and cp>=MIN_CASE_PASSES
    return {"model":meta["name"],"role":meta["role"],"digest":meta["digest"],"size_bytes":meta["size_bytes"],"parameter_size":meta["parameter_size"],"quantization_level":meta["quantization_level"],"total_cases":len(cases),"provider_error_count":pe,"schema_valid_count":sv,"case_pass_count":cp,"case_pass_rate":round(cp/len(cases),6),"epistemic_violation_count":epi,"repeatability":rep,"median_total_duration_ms":round(statistics.median(dur),3) if dur else None,"qualified":qual}
def select_recommendation(s):
    q=[x for x in s if x["qualified"]]
    if not q:return None
    return sorted(q,key=lambda x:(x["size_bytes"],-x["case_pass_count"],x["median_total_duration_ms"] if x["median_total_duration_ms"] is not None else float("inf"),x["model"]))[0]["model"]
def select_quality_leader(s):
    if not s:return None
    return sorted(s,key=lambda x:(-x["case_pass_count"],x["provider_error_count"],x["epistemic_violation_count"],x["median_total_duration_ms"] if x["median_total_duration_ms"] is not None else float("inf"),x["size_bytes"]))[0]["model"]
def safe_slug(m):return re.sub(r"[^A-Za-z0-9._-]+","_",m)