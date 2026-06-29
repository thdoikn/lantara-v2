"""Domain errors for the antrean service layer. Views translate these to HTTP."""


class AntreanError(Exception):
    """Base class; carries a human (Indonesian) message and an HTTP-ish code."""

    status_code = 400

    def __init__(self, message):
        super().__init__(message)
        self.message = message


class QuotaExhaustedError(AntreanError):
    status_code = 409


class OutsideOperatingWindowError(AntreanError):
    status_code = 409


class DuplicateActiveTicketError(AntreanError):
    status_code = 409


class InvalidTicketStateError(AntreanError):
    status_code = 409
