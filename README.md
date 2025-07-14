### Testing branch for "Identities"

An identity is the LOON vay to make key value pairs.

The syntax of an identity is as following:


```
key <-> value

```

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

And it can be accessed in these ways:

- `->Label.key` (or for accessing only the value: `->Label.key&`)
- `->Label:space.key` (or for accessing only the value: `->Label:space.key&`)

Also i made sure to add type check, so that everything doesn't come as a string.