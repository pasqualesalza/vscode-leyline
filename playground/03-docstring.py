def calculate_discount(price: float, percentage: float) -> float:
    """

    return price * (1 - percentage / 100)


def apply_tax(price: float, tax_rate: float = 0.21) -> float:
    """Apply tax to a price.

    Args:
        price: The base price.
        tax_rate: The tax rate (default 21%).

    Returns:
        The price including tax.
    """
    return price * (1 + tax_rate)


total = apply_tax(calculate_discount(100.0, 10.0))
print(f"Total: {total:.2f}")
