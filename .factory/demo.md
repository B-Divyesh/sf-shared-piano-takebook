# Takebook demo sandbox

Open <https://shared-piano-takebook.sociobot.in/?demo=1> or select **Try it with sample data** on the first screen.

The demo contains three short practice takes: “Lighten the turn,” “Recital cadence,” and “Even staccato.” The first sample opens in the recorder with a loop range and teacher note already set.

Demo takes use the IndexedDB database `demo:takebook`. Demo license state uses `demo:sb_license:shared-piano-takebook` and its matching verdict key. The normal `takebook` database and normal license keys are not read while demo mode is active.

**Reset demo** replaces the demo database with the three original samples. **Start for real** clears the demo database and demo license state before returning to the normal app.
