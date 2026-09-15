import asyncio
import httpx
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

LOCATIONS = ["Tadepalligudem", "Kakinada", "Delhi", "Leh"]

async def run_test():
    async with httpx.AsyncClient(timeout=60.0) as client:
        for loc in LOCATIONS:
            print(f"\n==========================================")
            print(f"Testing Alerts for: {loc}")
            print(f"==========================================")
            
            res = await client.get(f"http://localhost:8000/api/alerts?location={loc}&language=en")
            assert res.status_code == 200, f"Failed for {loc}: {res.text}"
            data = res.json()
            
            print(f"Resolved Location: {data['location']}")
            print(f"Total Alerts: {data['total']}")
            
            # Verify data safety: location in alert matches requested location
            for a in data['alerts']:
                print(f"  [{a['severity'].upper()}] {a['title']}")
                print(f"    Type: {a['alert_type']} | Measured: {a['triggered_value']} | Threshold: {a['threshold_value']}")
                print(f"    Reason: {a.get('reason')}")
                assert a['location'] == data['location'], "Stale location detected in alert!"
                assert a['severity'] in {"low", "medium", "high", "critical"}, "Invalid severity!"
                
            print(f"\nAI Public Safety Briefing (EN):")
            print(data.get('ai_explanation'))

        # Test Telugu alerts
        print("\n==========================================")
        print("Testing Alerts in Telugu for Tadepalligudem:")
        print("==========================================")
        res_te = await client.get("http://localhost:8000/api/alerts?location=Tadepalligudem&language=te")
        assert res_te.status_code == 200
        data_te = res_te.json()
        print("Telugu AI Safety Briefing:")
        print(data_te.get('ai_explanation'))
        assert data_te.get('ai_explanation') is not None
        
        print("\nSUCCESS: All Step 3 Dynamic Alert tests passed successfully!")

if __name__ == "__main__":
    asyncio.run(run_test())
