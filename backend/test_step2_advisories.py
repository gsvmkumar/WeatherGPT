import asyncio
import httpx
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

TEST_LOCATIONS = ["Tadepalligudem", "Kakinada", "Vijayawada"]

async def run_test():
    async with httpx.AsyncClient(timeout=60.0) as client:
        for loc in TEST_LOCATIONS:
            print(f"\n==========================================")
            print(f"Testing Advisory for: {loc}")
            print(f"==========================================")
            
            # 1. English
            res_en = await client.get(f"http://localhost:8000/api/advisories?location={loc}&language=en")
            assert res_en.status_code == 200, f"Failed for {loc} EN: {res_en.text}"
            data_en = res_en.json()
            print(f"Resolved Location: {data_en['location']}")
            print(f"Total Rules Triggered: {data_en['total']}")
            
            agri_recs = [a['recommendation'] for a in data_en['advisories'] if a['category'] == 'agriculture']
            print(f"Agricultural Recommendations ({len(agri_recs)}):")
            for r in agri_recs:
                print(f"  • {r}")
                
            print(f"\nGemini Grounded AI Explanation (EN):")
            print(f"{data_en.get('ai_explanation')}\n")
            
            assert len(agri_recs) > 0, f"No agricultural advisories generated for {loc}!"

        # 2. Telugu check for Tadepalligudem
        print("==========================================")
        print("Testing Advisory for Tadepalligudem in Telugu:")
        print("==========================================")
        res_te = await client.get("http://localhost:8000/api/advisories?location=Tadepalligudem&language=te")
        assert res_te.status_code == 200, f"Failed for Tadepalligudem TE: {res_te.text}"
        data_te = res_te.json()
        print("Telugu AI Explanation:")
        print(data_te.get('ai_explanation'))
        assert data_te.get('ai_explanation') is not None, "Missing Telugu explanation!"
        print("\nSUCCESS: All Step 2 Advisory tests passed across real locations!")

if __name__ == "__main__":
    asyncio.run(run_test())
