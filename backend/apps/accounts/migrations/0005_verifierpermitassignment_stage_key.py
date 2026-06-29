from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_otpcode_attempts"),
    ]

    operations = [
        migrations.AddField(
            model_name="verifierpermitassignment",
            name="stage_key",
            field=models.SlugField(
                blank=True,
                default="",
                help_text="Blank = all stages of this izin; otherwise a single WorkflowStage.key.",
                max_length=120,
            ),
        ),
        migrations.AlterUniqueTogether(
            name="verifierpermitassignment",
            unique_together={("user", "permit_type", "stage_key")},
        ),
    ]
