
def withdrawal_fee(amount: float):
    """
    Calculates the institutional maintenance fee.
    Standard: 1% flat.
    """
    return round(amount * 0.01, 2)
