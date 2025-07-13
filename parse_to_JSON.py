import sys
import json

filename = sys.argv[1]
labels: dict[str, list] = {}
spaces: dict[str, list] = {}
label_block = []
space_block = []
any_space = False
insert_in_space = False
label_name = ""
space_name = ""
code = []

with open(filename, "r") as file:
	if ".loon" in filename:
		for line in file:
			line = line.strip()
			code.append(line)
	elif not filename:
		print("ERROR: must insert input LOON file")
		exit()
	else:
		print("ERROR: invalid input file type, must be LOON")
		exit()
		
for line in code:
	line = line.strip()
	if line.startswith("(") and line.endswith(")"):
		label_name = line.strip("()")
		label_block = []  # Reset block for new label
	elif line.startswith(":"):
		line = line.strip()
		if insert_in_space:
			print("ERROR: can't inject a space inside a space!")
			exit()
		any_space = True
		insert_in_space = True
		space_name = line[1:]
		space_block = []
	elif line == "end:":
		insert_in_space = False
		label_block.append({space_name : space_block})
		spaces[space_name] = space_block
		space_name = ""
		space_block = []
	elif line == "end":
		labels[label_name] = label_block
		label_block = []
		label_name = ""
	elif line.startswith("->"):
		if ":" in line:
			if line.endswith("&"):
				label, space = line.split(':')
				label = label[2:].strip()
				space = space[:-1].strip()
				if label in labels:
					if space in spaces:
						if insert_in_space:
							space_block.extend(spaces[space])
						else:
							label_block.extend(spaces[space])
					else:
						print(f"ERROR: the space '{space}' does not exist")
						exit()
			
				else:
					print(f"ERROR: the label '{label}' does not exist")
					exit()
			else:
				label, space = line.split(':')
				label = label[2:].strip()
				space = space.strip()
				space_content = spaces[space]
				if label in labels:
					if space in spaces:
						if insert_in_space:
							space_block.append({space : space_content})
						else:
							label_block.append({space : space_content})
					else:
						print(f"ERROR: the space '{space}' does not exist")
						exit()
				else:
					print(f"ERROR: the label '{label}' does not exist")
					exit()
		else:
			if line.endswith("&"):
				label = line[2:-1].strip()
				label_content = labels[label]
				if label in labels:
					if insert_in_space:
						space_block.extend(label_content)
					else:
						label_block.extend(label_content)
				else:
					print(f"ERROR: the label '{label}' does not exist")
					exit()
			else:
				label = line[2:].strip()
				label_content = labels[label]
				if label in labels:
					if insert_in_space:
						print(f"ERROR: can't inject label inside space {space_name}")
						exit()
					else:
						label_block.append({label : label_content})
				
	elif not line or line.startswith("<") and line.endswith(">"):
		continue
	else:
		if insert_in_space:
			space_block.append(line)
		else:
			label_block.append(line)


if ".json" in sys.argv[2]:
	with open(sys.argv[2], "w") as f:
		json.dump(labels, f, indent=4)
elif not sys.argv[2]:
	print("ERROR: must insert output JSON file")
	exit()
else:
	print("ERROR: invalid destination file type, must be JSON")
	error()