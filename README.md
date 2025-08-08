# LOON (Label Oriented Object Notation)

<div align="center">
<img src="https://github.com/mmmmosca/LOON/blob/0a6c62862645b1c7eb249a0d0cf098f2e605eb56/Python/Logo.png" width="400" height="400">
</div>

>LOON is a high-level configuration language that compiles down to JSON

---

## Installation

⚠️THE PYTHON VERSION IS NOW DEPRECATED AND COULD NOT WORK AS INTENDED⚠️

### With npm

If you want to use the given JSON compiler made in JavaScript, you can install it with this command:

`npm install -g loon-parser`

then this command:

`loon-js input.loon -o output.json`

### From source

You can build from source by using the instructions below:

1. First you'll need to clone the repository with this command:

`git clone https://github.com/mmmmosca/LOON/`

2. And then use npm for installing the tool inside the "JavaScript" folder:

`npm install -g .`

If you want it to be editable use this command:

`npm link`

---

## Syntax

LOON files (that end in .loon) have a basic structure, there are two hierarchies and key-value pairs along with some operators:
- Labels (top-level)
- Spaces (sub-level)
- Identities (basic key value pairs)
- Operators (for manipulating data)

### Labels

Labels serve as the main structure of the language, they are essentially containers for identities, spaces and other labels (we'll discuss about this later).

A label is defined like this:
```
(Label)
    string = "string"
    bool = true
    int = 123
    float = 3.14
end
```

You can also mark a label as hidden, by prefixing the open parenthesis with a % (called the "cloak operator").

An hidden label will be treated by the parser as a normal label, but on the final output it won't be shown, this can drastically improve the readability of the output JSON.

A hidden label can be defined like this:
```
%(HiddenLabel)
    string = "string"
    bool = true
    int = 123
    float = 3.14
end
```

Every label must end with the "end" keyword or it will not be parsed correctly.

### Spaces

A space is a sub-level structure that live inside labels.

As well as labels they can contain raw data, identities and other spaces or labels (we'll also discuss about this later on).

Defining a space is similar to how you define a label, but instead of enclosing the name of a space between brackets you prefix it with a colon (':'):
```
(Label)
    :Space
        "string"
        true
        123
        3.14
    end:
end
```

A space defined in a hidden label will also be hidden with it.

Like labels, they have to end with the "end:" keyword.

### Identities

An identity is the LOON way to make key value pairs.

The syntax of an identity is as following:


`key = value`

This `=` is called the "identity operator".

An identity put in context can appear like this:

```
(Label)
    key = "value"
    :space 
        key2 = 123
    end:
end
```
and will compile to:

```
{
    "Label": {
        "key": "value",
        "space": {
            "key2": 123
        }
    }
}
```

### Comments

Loon allows to write comments by enclosing a text between `<>`

`<this is a comment>`

## Operators

There are six operators:

- `->`: injection operator

- `=`: identity operator (used for identities)

- `%` cloak operator (used for hidden labels)

- `&`: dereference operator

- `@`: insertion operator

- `$`: key-reference operator

### Injection and dereference operator

The biggest feature of LOON is the injection operator.

It allows to take data from other labels/spaces and reuse it and modify it as you like.

Injection takes this syntax:
`->Label[:Space][.IdentityKey][&]`

This allows to either extract the content or value from a label/space or identity

#### Injecting labels

Taken this LOON:

```
(Label)
    :space
        name = "John Doe"
        age = 21
    end:
end

```

We can inject this label in these ways:

```
(Label2)
    ->Label
    ->Label&
end
```

which compiles to this JSON:
```
{
    "Label": {
        "space": {
            "name": "John Doe",
            "age": 21
        }
    },
    "Label2": {
        "Label": {
            "space": {
                "name": "John Doe",
                "age": 21
            }
        },
        "space": {
            "name": "John Doe",
            "age": 21
        }
    }
}
```

The dereference operator works by only injecting the content of a label rather than the intire structure.

#### Injecting spaces

The same logic also applies to spaces, however the syntax for accessing a space is as follows:
`->Label:Space`

By taking the same example from before:

```
(Label)
    :space
        name = "John Doe"
        age = 21
    end:
end

```

We can inject the space this way:

```
(Label2)
    ->Label:space
    ->Label:space&
end
```

And compiles to this JSON:
```
{
    "Label": {
        "space": {
            "name": "John Doe",
            "age": 21
        }
    },
    "Label2": {
        "space": {
            "name": "John Doe",
            "age": 21
        },
        "name": "John Doe",
        "age": 21
    }
}
```

### Injecting identities

Identities can be injected in these ways:

- `->Label.key` (and for accessing only the value: `->Label.key&`), this will inject both the key and the value associated with it
- `->Label:space.key` (and for accessing only the value: `->Label:space.key&`), same for this

It's also possible to modify identities when injected from other labels/spaces.

Say we have a label called BaseInfo, that stores a temeplate of our data:

```
(BaseInfo)
    phone_number = 123
    email = "example@email.com"
end
```

we can now inject the content of BaseInfo onto other labels to reuse that information:

```
(UserInfo)
    ->BaseInfo&
    phone_number = 9999999999
    email = "fake123@gmail.com"
end

(User)
    ->UserInfo&
    name = "John Doe"
    age = 21
end
```

and then compiles to this JSON:
```
{
    "BaseInfo": {
        "phone_number": 123,
        "email": "example@email.com"
    },
    "UserInfo": {
        "phone_number": 9999999999,
        "email": "fake123@gmail.com"
    },
    "User": {
        "phone_number": 9999999999,
        "email": "fake123@gmail.com",
        "name": "John Doe",
        "age": 21
    }
}

```

Injection can happen anywhere, at any time in your code, so it's possible to inject labels inside spaces, spaces in spaces, spaces in labels and labels in labels.

You can also inject the content of labels/spaces and values of other identities, in identities.

For doing this, enclose the reference in square brackets ("[]") when assigning a value to an identity.

Here's the syntax:

`key = [Label{:Space}{.IdentityKey}]`

And you can also reference any other identity key with the "Key-reference operator" ($).

You effectively do this:
```
->Label.key
key = "new value"
```

But in a single line like this:
```
$Label.key = "new value"
```

> Note: The syntax for injecting hidden labels and spaces is the same as other labels and spaces. And the same goes for Injecting inside identities or referencing identity keys

## Insertion Operator

You can import the content of another LOON file by prefixing it's path with the insertion operator ("@").

Here's the syntax:

`@imported_file.loon`

Let's say we have a file where we have a set of template information, let's call it `template.loon`.

template.loon:
```
(InfoTemplate)
   :userInfo
        name = "Unknown"
        age = 0
        email = "example@email.com"
   end:
end
```

then in an other file you can import this template and then modify it's information to our needs.

info.loon:
```
@template.loon

(DisplayedInfo)
    ->InfoTemplate:userInfo.name
    ->InfoTemplate:userInfo.age
    name = "mmmmosca"
    age = 17
end
```

Which compiles to this JSON:

```
{
    "InfoTemplate": {
        "userInfo": {
            "name": "Unknown",
            "age": 0,
            "email": "example@email.com"
        }
    },
    "DisplayedInfo": {
        "name": "mmmmosca",
        "age": 17
    }
}
```

