from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    # Normalise to { "detail": str, "errors": {field: [msg]} }
    errors = {}
    detail = response.data

    if isinstance(response.data, dict):
        detail = response.data.pop("detail", "An error occurred.")
        errors = response.data
    elif isinstance(response.data, list):
        detail = " ".join(str(e) for e in response.data)

    response.data = {"detail": str(detail), "errors": errors}
    return response
