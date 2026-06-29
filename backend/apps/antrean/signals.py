"""Collection-stage seam: offer an antrean ticket when an izin submission becomes
ready for pickup. Dependency direction is antrean → submissions only; submissions
and engine never import antrean.

(Wired in a later step; placeholder keeps AntreanConfig.ready() importable.)
"""
