def fibonacci(n: int) -> int:


def factorial(n: int) -> int:
    if n <= 1:
        return 1
    return n * factorial(n - 1)


print(fibonacci(10))
print(factorial(5))
