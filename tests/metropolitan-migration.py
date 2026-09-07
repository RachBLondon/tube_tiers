from pathlib import Path
import subprocess,json,uuid
root=Path(__file__).resolve().parents[1];schema='met_test_'+uuid.uuid4().hex[:12];actor=str(uuid.uuid4())
def sql(query,check=True):
 r=subprocess.run(['docker','exec','-i','supabase_db_tube-tiers','psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],input=query,text=True,capture_output=True,timeout=30)
 if check and r.returncode:raise RuntimeError(r.stderr)
 return r
try:
 migrations=[root/'supabase/migrations'/name for name in ['20260907154355_create_tube_rankings.sql','20260907202754_cap_submissions_at_1000.sql','20260907210327_add_metropolitan_line.sql']]
 sql(f'create schema {schema};'+''.join(p.read_text().replace('public.',schema+'.') for p in migrations[:-1]))
 lines=['bakerloo','central','circle','district','elizabeth','hammersmith-city','jubilee','northern','piccadilly','victoria','waterloo-city','overground','dlr','trams','thameslink','cable-car','uber-boat','heathrow-express']
 ranking=json.dumps(dict.fromkeys(lines,'A'))
 sql(f"insert into auth.users(id) values('{actor}'); insert into {schema}.submissions(user_id,username,rankings) values('{actor}','Existing voter','{ranking}'::jsonb);")
 before=json.loads(sql(f'select row_to_json(s) from {schema}.submissions s;').stdout)
 sql(migrations[-1].read_text().replace('public.',schema+'.'))
 after=json.loads(sql(f'select row_to_json(s) from {schema}.submissions s;').stdout)
 expected={**before,'rankings':{**before['rankings'],'metropolitan':'C'}}
 assert after==expected,'Backfill must only add Metropolitan C, preserving all other fields and timestamps'
 assert sql(f"select {schema}.valid_tube_rankings('{ranking}'::jsonb);").stdout.strip()=='f'
 claims=json.dumps({'sub':actor,'role':'authenticated'})
 updated=json.dumps(after['rankings'])
 result=sql(f"select set_config('request.jwt.claims','{claims}',false);select {schema}.submit_ranking('Existing voter','{updated}'::jsonb);",False)
 assert 'Please wait 30 seconds' in result.stderr,'Cooldown must be restored after migration'
 print('PASS: existing votes receive Metropolitan C; other votes and timestamps are unchanged; 18-line votes are rejected; cooldown is restored.')
finally:
 sql(f"drop schema if exists {schema} cascade;delete from auth.users where id='{actor}';")
