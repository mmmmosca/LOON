# Testing branch for "Identities"

### TL;DR

New features:
- key-value pairing with `<->`
- can be accessed with `->Label.key` (`->Label.key&` for accessing only the value) or `->Label:space.key` (`->Label:space.key&` for accessing only the value)
- removed all the costrains with injection
- type checking
- better parsing

An identity is the LOON way to make key value pairs.

The syntax of an identity is as following:


`key <-> value`

This `<->` is called the "identity operator".

An identity put in context can appear like this:

```
(Label)
    key <-> "value"
    :space 
        key2 <-> 123
    end:
end
```
and will parse to:

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

Identities can be accessed in these ways:

- `->Label.key` (or for accessing only the value: `->Label.key&`)
- `->Label:space.key` (or for accessing only the value: `->Label:space.key&`)

I officially removed all the weird injection rules, allowing more freedom to the user other than a better parser that supports type checking, so that everything doesn't come as a string.

It's also possible to modify identities when injected from other labels/spaces.

Say we have a label called BaseInfo, that stores a temeplate of our data:

```
(BaseInfo)
    phone_number <-> 123
    email <-> "example@email.com"
end
```

we can now inject the content of BaseInfo onto other lables to reuse that information:

```
(UserInfo)
    ->BaseInfo&
    phone_number <-> 9999999999
    email <-> "fake123@gmail.com"
end

(User)
    ->UserInfo&
    name <-> "John Doe"
    age <-> 21
end
```

and the parses to this json:
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

Fun fact:
the syntax of the injection operator (`<->`) was inspired by the chemical notation for reversible reactions
