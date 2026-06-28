from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_user_jabatan"),
    ]

    operations = [
        migrations.AddField(
            model_name="otpcode",
            name="attempts",
            field=models.PositiveSmallIntegerField(default=0),
        ),
    ]
