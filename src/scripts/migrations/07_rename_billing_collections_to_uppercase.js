module.exports = {
  run: async (mongoose, db) => {
    const collectionsToRename = [
      { old: 'subscriptionplans', new: 'SUBSCRIPTIONPLANS' },
      { old: 'institutesubscriptions', new: 'INSTITUTESUBSCRIPTIONS' },
      { old: 'billingtransactions', new: 'BILLINGTRANSACTIONS' }
    ];

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    for (const { old, new: newName } of collectionsToRename) {
      if (collectionNames.includes(old)) {
        try {
          // If the new uppercase collection somehow already exists, drop it first to avoid Conflict
          if (collectionNames.includes(newName)) {
            console.log(`[WARN] Collection ${newName} already exists, merging not possible via rename. Removing ${newName} before renaming ${old}.`);
            await db.collection(newName).drop();
          }

          console.log(`Renaming collection ${old} to ${newName}...`);
          await db.collection(old).rename(newName);
          console.log(`Successfully renamed ${old} -> ${newName}`);
        } catch (error) {
          console.error(`Failed to rename collection ${old} to ${newName}:`, error);
        }
      } else {
        console.log(`Collection ${old} does not exist, skipping rename.`);
      }
    }
  }
};
