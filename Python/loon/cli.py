# loon/cli.py

import argparse
import sys
import json
from .parser import parse_loon_file  # Import your existing parser function

def main():
    parser = argparse.ArgumentParser(
        description="LOON: Label-Oriented Object Notation parser"
    )
    parser.add_argument("input", help="Input .loon file")
    parser.add_argument("-o", "--output", help="Output .json file")
    args = parser.parse_args()

    try:
        data = parse_loon_file(args.input)

        if args.output:
            with open(args.output, "w") as f:
                json.dump(data, f, indent=4)
            print(f"Parsed and saved to {args.output}")
        else:
            print(json.dumps(data, indent=4))
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)