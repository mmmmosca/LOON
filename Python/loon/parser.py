import json  
import re  
  
def infer_value_type(value: str, labels=None, hidden_labels=None):  
	value = value.strip()  
	if value.startswith("[") and value.endswith("]") and labels:  
		return resolve_reference(value, labels, hidden_labels)  
  
	if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):  
		return value[1:-1]  
	elif value.lower() == "true":  
		return True  
	elif value.lower() == "false":  
		return False  
	else:  
		try:  
			return float(value) if '.' in value else int(value)  
		except ValueError:  
			return value  
  
def resolve_reference(value, labels, hidden_labels):  
	ref = value[1:-1].strip()  
	all_labels = {**labels, **hidden_labels}  
  
	if "." in ref:  
		scope, identity = ref.split(".", 1)  
		if ":" in scope:  
			lbl, sp = scope.split(":", 1)  
			data = all_labels[lbl][sp]  
		else:  
			data = all_labels[scope]  
		return data.get(identity)  
	elif ":" in ref:  
		lbl, sp = ref.split(":", 1)  
		return all_labels[lbl][sp]  
	else:  
		return all_labels[ref]  
  
def parse_loon_file(filename, labels=None, spaces=None, hidden_labels=None, label_hidden_map=None):  
	if labels is None:  
		labels = {}  
	if hidden_labels is None:  
		hidden_labels = {}  
	if label_hidden_map is None:  
		label_hidden_map = {}  
	if spaces is None:  
		spaces = {}  
  
	with open(filename, "r") as file:  
		if not filename.endswith(".loon"):  
			print("ERROR: file must be a .loon file")  
			exit()  
		code = [line.strip() for line in file if line.strip() and not line.strip().startswith("<")]  
  
	current_label = None  
	current_space = None  
	label_stack = {}  
	space_stack = {}  
	insert_in_space = False  
  
	for line in code:  
		if (line.startswith("%(") or line.startswith("(")) and line.endswith(")"):  
			is_hidden = line.startswith("%(")  
			label_name = line[2:-1] if is_hidden else line[1:-1]  
			current_label = label_name  
			label_stack[current_label] = []  
			label_hidden_map[current_label] = is_hidden  
			current_space = None  
			insert_in_space = False  
  
		elif line.startswith(":"):  
			current_space = line[1:]  
			space_stack[current_space] = None  
			insert_in_space = True  
  
		elif line == "end:":  
			result = space_stack[current_space]  
			label_stack[current_label].append((current_space, result))  
			spaces[current_space] = result  
			insert_in_space = False  
			current_space = None  
  
		elif line == "end":  
			result = {}  
			for item in label_stack[current_label]:  
				if isinstance(item, tuple):  
					key, val = item  
					result[key] = val  
				elif isinstance(item, dict):  
					result.update(item)  
				elif isinstance(item, str):  
					result[item] = None  
			if label_hidden_map.get(current_label):  
				hidden_labels[current_label] = result  
			else:  
				labels[current_label] = result  
			current_label = None  
  
		elif "=" in line:  
			k, v = map(str.strip, line.split("=", 1))  
			val = infer_value_type(v, labels, hidden_labels)  
			if insert_in_space:  
				blk = space_stack[current_space]  
				if blk is None:  
					blk = {}  
					space_stack[current_space] = blk  
				elif isinstance(blk, list):  
					raise Exception(f"Cannot mix key-value with list in space '{current_space}'")  
				blk[k] = val  
			else:  
				label_stack[current_label].append({k: val})  
  
		elif line.startswith("@"):  
			file_name = line[1:]  
			if not file_name.endswith(".loon"):  
				print("ERROR: file must be a .loon file")  
				exit()  
			temp_labels = {}  
			temp_hidden = {}  
			temp_hidden_map = {}  
			parse_loon_file(file_name, temp_labels, spaces, temp_hidden, temp_hidden_map)  
			labels.update(temp_labels)  
			hidden_labels.update(temp_hidden)  
			label_hidden_map.update(temp_hidden_map)  
			continue  
  
		elif not line.startswith("->"):  
			val = infer_value_type(line, labels, hidden_labels)  
			if insert_in_space:  
				blk = space_stack[current_space]  
				if blk is None:  
					blk = []  
					space_stack[current_space] = blk  
				elif isinstance(blk, dict):  
					blk = [{k: v} for k, v in blk.items()]  
					space_stack[current_space] = blk  
				blk.append(val)  
			else:  
				label_stack[current_label].append(val)  
  
		elif line.startswith("->"):  
			raw = line[2:].strip()  
			is_value_only = raw.endswith("&")  
			if is_value_only:  
				raw = raw[:-1].strip()  
  
			all_labels = {**labels, **hidden_labels}  
  
			if "." in raw:  
				scope, identity = raw.split(".", 1)  
				if ":" in scope:  
					lbl, sp = scope.split(":", 1)  
					data = all_labels[lbl][sp]  
				else:  
					data = all_labels[scope]  
				val = data.get(identity)  
				injected = val if is_value_only else {identity: val}  
  
			elif ":" in raw:  
				lbl, sp = raw.split(":", 1)  
				data = all_labels[lbl][sp]  
				injected = data if is_value_only else {sp: data}  
  
			else:  
				data = all_labels[raw]  
				injected = data if is_value_only else {raw: data}  
  
			if insert_in_space:  
				blk = space_stack[current_space]  
				if is_value_only:  
					if blk is None:  
						blk = []  
						space_stack[current_space] = blk  
					elif isinstance(blk, dict):  
						blk = [{k: v} for k, v in blk.items()]  
						space_stack[current_space] = blk  
					blk.append(injected)  
				else:  
					if blk is None:  
						blk = {}  
						space_stack[current_space] = blk  
					elif isinstance(blk, list):  
						raise Exception(f"Cannot mix structured injection with list in space '{current_space}'")  
					blk.update(injected)  
			else:  
				label_stack[current_label].append(injected)  
  
	return labels
