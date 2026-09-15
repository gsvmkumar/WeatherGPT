import asyncio
import httpx
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

TEST_LOCATIONS = [
    "Kakinada",
    "Tadepalligudem",
    "Vijayawada",
    "Visakhapatnam",
    "Hyderabad",
    "Delhi",
    "Tirupati",
    "Rajahmundry",
    "Eluru",
    "Bhimavaram",
]

INVALID_LOCATION = "xyznotalocation999"

async def run_test():
    async with httpx.AsyncClient(timeout=30.0) as client:
        print("==================================================")
        print("STEP 4: Testing 10 Required Indian Locations")
        print("==================================================")

        for loc in TEST_LOCATIONS:
            res = await client.get(f"http://localhost:8000/api/locations/search?q={loc}")
            assert res.status_code == 200, f"Search failed for '{loc}': {res.text}"
            results = res.json()
            assert len(results) > 0, f"No results for '{loc}'"

            best = results[0]
            name = best["name"]
            state = best.get("state")
            lat = best["latitude"]
            lon = best["longitude"]
            display = best["display_name"]

            print(f"✓ '{loc}' -> {name} ({state or 'India'}) [{lat:.4f}, {lon:.4f}]")
            print(f"   Display: {display}")

            # Verify that current weather can be fetched with these coordinates
            w_res = await client.get(f"http://localhost:8000/api/weather/current?lat={lat}&lon={lon}&location={name}")
            assert w_res.status_code == 200, f"Weather fetch failed for {name}"
            w_data = w_res.json()
            assert "temperature_c" in w_data
            assert w_data["temperature_c"] is not None

        print("\n==================================================")
        print("Testing Invalid Location Handling")
        print("==================================================")
        inv_res = await client.get(f"http://localhost:8000/api/locations/search?q={INVALID_LOCATION}")
        print(f"Status Code: {inv_res.status_code}")
        print(f"Response: {inv_res.json()}")
        assert inv_res.status_code == 404, "Invalid location should return 404"
        assert "no locations found" in inv_res.json()["detail"].lower()

        print("\nSUCCESS: All 10 locations + invalid location verified perfectly!")

if __name__ == "__main__":
    asyncio.run(run_test())
