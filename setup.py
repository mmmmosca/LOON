# setup.py

from setuptools import setup, find_packages

setup(
    name="loon-parser",
    version="1.0",
    packages=find_packages(),
    entry_points={
        "console_scripts": [
            "loon = loon.cli:main",
        ]
    },
    install_requires=[],
    python_requires=">=3.7",
    description="LOON: Label-Oriented Object Notation parser",
    author="mmmmosca",
)