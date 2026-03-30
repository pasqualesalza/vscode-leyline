def process_items(items: list[str]) -> list[str]:
    """Process a list of items by stripping and uppercasing."""
    result = []
    for item in items:

    return result


def main():
    data = ["  hello ", " world  ", "  foo  "]
    processed = process_items(data)
    for p in processed:
        print(p)


if __name__ == "__main__":
    main()
