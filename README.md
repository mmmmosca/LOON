### Testing branch for "Identities"

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

Also i made sure to add type checking, so that everything doesn't come as a string.

Fun fact:
the syntax of the injection operator (`<->`) was inspired by the chemical notation for reversible reactions