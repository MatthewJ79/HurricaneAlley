export class DualStormRepository {
  mode = "dual";
  lastShadowError = null;

  constructor(primary, shadow, { strict = false, logger = console } = {}) {
    this.primary = primary;
    this.shadow = shadow;
    this.strict = strict;
    this.logger = logger;
  }

  async readCurrentSnapshot() {
    return this.primary.readCurrentSnapshot();
  }

  async writeCurrentSnapshot(snapshot) {
    await this.primary.writeCurrentSnapshot(snapshot);
    try {
      await this.shadow.writeCurrentSnapshot(snapshot);
      this.lastShadowError = null;
    } catch (error) {
      this.lastShadowError = error.message;
      this.logger.error(`[Storage] PostgreSQL shadow write failed: ${error.message}`);
      if (this.strict) throw error;
    }
  }

  async health() {
    const [primary, shadow] = await Promise.all([
      this.primary.health(),
      this.shadow.health(),
    ]);
    return {
      mode: this.mode,
      ok: primary.ok && (!this.strict || shadow.ok),
      primary,
      shadow,
      strict: this.strict,
      lastShadowError: this.lastShadowError,
    };
  }

  async close() {
    await Promise.all([this.primary.close(), this.shadow.close()]);
  }
}

