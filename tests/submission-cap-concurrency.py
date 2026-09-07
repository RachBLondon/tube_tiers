from pathlib import Path
import concurrent.futures, json, subprocess, uuid, threading
root=Path(__file__).resolve().parents[1]
schema='cap_test_'+uuid.uuid4().hex[:12]
ids=[str(uuid.uuid4()) for _ in range(1001)]
ids_sql=','.join("'"+i+"'::uuid" for i in ids)
lines=['bakerloo','central','circle','district','elizabeth','hammersmith-city','jubilee','metropolitan','northern','piccadilly','victoria','waterloo-city','overground','dlr','trams','thameslink','cable-car','uber-boat','heathrow-express']
ranking="'"+json.dumps(dict.fromkeys(lines,'B'))+"'::jsonb"
def sql(query,check=True):
    result=subprocess.run(['docker','exec','-i','supabase_db_tube-tiers','psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],input=query,text=True,capture_output=True,timeout=30)
    if check and result.returncode:raise RuntimeError(result.stderr)
    return result
try:
    # Execute the real migrations in an isolated schema on local Postgres.
    setup=f'create schema {schema}; grant usage on schema {schema} to authenticated;\n'
    for migration in sorted((root/'supabase/migrations').glob('*.sql')):
        setup+=migration.read_text().replace('public.',schema+'.')+'\n'
    setup+=f'insert into auth.users(id) select unnest(array[{ids_sql}]);\n'
    setup+=f"insert into {schema}.submissions(user_id,username,rankings) select id,'Race fixture',{ranking} from unnest(array[{','.join(chr(39)+i+chr(39)+'::uuid' for i in ids[:999])}]) id;"
    sql(setup)
    barrier=threading.Barrier(2)
    def vote(actor):
        barrier.wait()
        claims=json.dumps({'sub':actor,'role':'authenticated'})
        return sql(f"begin; select set_config('request.jwt.claims','{claims}',true); set local role authenticated; select {schema}.submit_ranking('Final slot',{ranking}); select pg_sleep(0.5); commit;",False)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(vote,ids[999:]))
    assert sum(r.returncode==0 for r in results)==1, 'Exactly one final-slot request must succeed'
    assert any('limit of 1,000 submissions' in r.stderr for r in results), 'The other request must receive the capacity error'
    assert sql(f'select count(*) from {schema}.submissions;').stdout.strip()=='1000'
    print('PASS: simultaneous final-slot requests produced one success, one rejection, and exactly 1,000 stored votes.')
finally:
    sql(f'drop schema if exists {schema} cascade; delete from auth.users where id = any(array[{ids_sql}]);')
