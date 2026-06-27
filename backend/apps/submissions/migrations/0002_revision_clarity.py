from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("submissions", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="submission",
            name="revision_due_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="submissionrevisionfield",
            name="original_value",
            field=models.JSONField(blank=True, null=True),
        ),
    ]
