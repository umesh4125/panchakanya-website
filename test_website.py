#!/usr/bin/env python3
"""
Test suite for Panchakanya Oil Stores website.
Verifies HTML validity, JSON structure, and core functionality.
"""

import json
import os
import sys
from pathlib import Path

# Set UTF-8 encoding for Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


def test_prices_json_exists():
    """Verify prices.json file exists"""
    assert Path('prices.json').exists(), "prices.json file not found"
    print("[PASS] prices.json exists")


def test_prices_json_valid():
    """Verify prices.json is valid JSON with required fields"""
    with open('prices.json', 'r') as f:
        prices = json.load(f)
    
    required_fields = [
        'source',
        'fetched_from',
        'updated',
        'kathmandu',
        'our_price',
        'margin_rs',
    ]
    
    for field in required_fields:
        assert field in prices, f"Missing required field: {field}"
    
    assert 'petrol' in prices['kathmandu'], "Missing kathmandu.petrol"
    assert 'diesel' in prices['kathmandu'], "Missing kathmandu.diesel"
    assert 'petrol' in prices['our_price'], "Missing our_price.petrol"
    assert 'diesel' in prices['our_price'], "Missing our_price.diesel"
    
    print("[PASS] prices.json has all required fields")


def test_prices_json_values():
    """Verify prices.json has reasonable fuel price values"""
    with open('prices.json', 'r') as f:
        prices = json.load(f)
    
    petrol = prices['kathmandu']['petrol']
    diesel = prices['kathmandu']['diesel']
    
    # Reasonable price range for fuel in Nepal (Rs per liter)
    assert 50 <= petrol <= 500, f"Petrol price out of range: {petrol}"
    assert 50 <= diesel <= 500, f"Diesel price out of range: {diesel}"
    
    print(f"[PASS] prices.json values are valid (Petrol: Rs {petrol}, Diesel: Rs {diesel})")


def test_prices_margin_applied():
    """Verify our_price correctly includes the margin"""
    with open('prices.json', 'r') as f:
        prices = json.load(f)
    
    margin = prices['margin_rs']
    noc_petrol = prices['kathmandu']['petrol']
    noc_diesel = prices['kathmandu']['diesel']
    our_petrol = prices['our_price']['petrol']
    our_diesel = prices['our_price']['diesel']
    
    expected_petrol = round(noc_petrol + margin, 2)
    expected_diesel = round(noc_diesel + margin, 2)
    
    assert our_petrol == expected_petrol, f"Petrol margin calculation incorrect: {our_petrol} != {expected_petrol}"
    assert our_diesel == expected_diesel, f"Diesel margin calculation incorrect: {our_diesel} != {expected_diesel}"
    
    print(f"[PASS] Margin correctly applied (Rs {margin} added to NOC prices)")


def test_index_html_exists():
    """Verify index.html file exists"""
    assert Path('index.html').exists(), "index.html file not found"
    print("[PASS] index.html exists")


def test_index_html_structure():
    """Verify index.html has required structure"""
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()
    
    required_elements = [
        '<html',
        '<head>',
        '<body',
        'Panchakanya Oil Stores',
        'tailwindcss.com',
        'fonts.googleapis.com',
    ]
    
    for element in required_elements:
        assert element in content, f"Missing required element: {element}"
    
    print("[PASS] index.html has correct structure")


def test_readme_exists():
    """Verify README.md file exists"""
    assert Path('README.md').exists(), "README.md file not found"
    print("[PASS] README.md exists")


def test_images_exist():
    """Verify images directory and pump photo exist"""
    assert Path('images').exists(), "images directory not found"
    assert Path('images/pump_photo.jpg').exists(), "pump_photo.jpg not found"
    print("[PASS] Images directory and pump photo exist")


def test_github_workflow_exists():
    """Verify GitHub Actions workflow exists"""
    workflow_path = Path('.github/workflows/update-fuel-prices.yml')
    assert workflow_path.exists(), "GitHub Actions workflow not found"
    print("[PASS] GitHub Actions workflow exists")


def test_github_workflow_syntax():
    """Verify GitHub Actions workflow has correct structure"""
    workflow_path = Path('.github/workflows/update-fuel-prices.yml')
    content = workflow_path.read_text()
    
    required_elements = [
        'name:',
        'on:',
        'jobs:',
        'runs-on:',
        'steps:',
        'actions/checkout@v4',
    ]
    
    for element in required_elements:
        assert element in content, f"Missing required element in workflow: {element}"
    
    print("[PASS] GitHub Actions workflow has correct syntax")


def run_all_tests():
    """Run all tests and report results"""
    print("\n" + "="*60)
    print("Testing Panchakanya Oil Stores Website")
    print("="*60 + "\n")
    
    tests = [
        test_prices_json_exists,
        test_prices_json_valid,
        test_prices_json_values,
        test_prices_margin_applied,
        test_index_html_exists,
        test_index_html_structure,
        test_readme_exists,
        test_images_exist,
        test_github_workflow_exists,
        test_github_workflow_syntax,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"[FAIL] {test.__name__}: {e}")
            failed += 1
        except Exception as e:
            print(f"[FAIL] {test.__name__}: Unexpected error: {e}")
            failed += 1
    
    print("\n" + "="*60)
    print(f"Results: {passed} passed, {failed} failed")
    print("="*60 + "\n")
    
    return failed == 0


if __name__ == '__main__':
    success = run_all_tests()
    exit(0 if success else 1)


