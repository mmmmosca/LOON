# 🟢 LOON — Label Oriented Object Notation

**LOON** is a human-readable, hierarchical, and extensible data format that provides a modular alternative to JSON, XML, and YAML. It introduces the concept of **labels** and **spaces**, which form the core of its structure.

LOON is ideal for configuration files, intermediate data representations, and tools that benefit from label-based structure. Its syntax is inspired by simplicity and clarity.

---

## 📦 Key Features

- 🧱 **Label-based structure**: Organized via uniquely named blocks.
- 🧩 **Spaces**: Subsections within labels for encapsulated data.
- 🔁 **Injection operator (`->`)**: Reuse and modularize your data via label/space references.
- 💬 **Inline comments**: Cleanly document data without affecting structure.
- 🌱 **Extensible**: Easy to parse, manipulate, and transpile into JSON or other formats.
- 📁 **`.loon` extension**: Recognizable file format.

---

## 🔧 Basic Syntax

### 🔸 Labels

Labels are defined using parentheses and represent top-level named blocks:

```loon
(MyLabel)
    someValue
    otherValue
end
```

🔹 Spaces

Spaces are sub-containers defined using :spaceName inside labels or other spaces:
```loon
(MyLabel)
    :settings
        option1
        option2
    end:
end
```

Spaces always end with end:.


---

🛠️ The Injection Operator (->)

The -> operator is called the injection operator. It allows you to inject content from one label or space into another label or space.

Inject full label:

->MyLabel

Inject only label content:

->MyLabel&

Inject full space:

->MyLabel:space

Inject only space content:

->MyLabel:space&


---

💡 Comment Syntax

LOON supports comments using angle brackets:

<My comment here>

Comments can be placed anywhere on their own line and are ignored by the parser.


---

✅ Injection Rules Summary

| →Label | →Label:Space | →Label& | →Label:Space& |
| :------ | :------------ | :------- | :------------- |
| Only labels | Labels and spaces | Labels and spaces | Labels and spaces |


---

📂 Example
```loon
(Person)
    :name
        Alice
    end:
    :age
        30
    end:
end

(Profile)
    ->Person:name
    ->Person:age
end

(Summary)
    ->Profile&
    <Injects only the content of the Profile label>
end
```

➤ Equivalent JSON Output

```json

{
    "Person": [
        {
            "name": [
                "Alice"
            ]
        },
        {
            "age": [
                "30"
            ]
        }
    ],
    "Profile": [
        {
            "name": [
                "Alice"
            ]
        },
        {
            "age": [
                "30"
            ]
        }
    ],
    "Summary": [
        {
            "name": [
                "Alice"
            ]
        },
        {
            "age": [
                "30"
            ]
        }
    ]
}
```

---

🔄 CLI Usage Example

If you use the provided LOON parser (written in Python), you can run:

python3 loon_parser.py input.loon output.json

This will transpile a .loon file into a JSON structure.


---

🔃 Parser Output Behavior

All values are treated as strings.

Nested labels/spaces are translated into nested JSON arrays/dictionaries.

Spaces become named sub-objects in JSON.



---

🧪 Sample Use Cases

Game data and entity systems.

Configuration and settings files.

Intermediate transformation step before JSON export.

Text-driven data structure prototyping.

Structured prompt building or code generation.



---

📝 Design Philosophy

LOON was inspired by the verbosity of XML, the strictness of JSON, and the simplicity of YAML. By introducing labels, spaces, and injection, LOON enables modular and structured data modeling in a clear and scriptable format.

It is designed to be:

Declarative — The structure is predictable.

Modular — You can reuse components like code.

Readable — Clean syntax makes it accessible.

Transpiler-friendly — Ideal as an intermediate format.



---

📁 File Extension

All LOON files should use the .loon extension.

config.loon


---

📜 License

Licensed under the MIT License.


---

👤 Author

Created by [mosca]

