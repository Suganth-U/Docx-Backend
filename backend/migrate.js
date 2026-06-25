const { MongoClient } = require('mongodb');

async function migrate() {
  console.log("Starting data migration from Local to Atlas...");
  const localUri = "mongodb://127.0.0.1:27017/docx";
  const atlasUri = "mongodb+srv://suganthdz:kasthury1908@docxcluster.au6ednf.mongodb.net/docx?retryWrites=true&w=majority&appName=DocxCluster";

  const localClient = await MongoClient.connect(localUri);
  const atlasClient = await MongoClient.connect(atlasUri);

  const localDb = localClient.db();
  const atlasDb = atlasClient.db();

  const collections = await localDb.listCollections().toArray();

  for (let c of collections) {
    if (c.name.startsWith('system.')) continue;
    
    const docs = await localDb.collection(c.name).find({}).toArray();
    
    if (docs.length > 0) {
      // Clear existing in Atlas just in case
      await atlasDb.collection(c.name).deleteMany({});
      await atlasDb.collection(c.name).insertMany(docs);
      console.log(`[✔] Copied ${docs.length} documents to '${c.name}'`);
    } else {
      console.log(`[-] Skipped '${c.name}' (Empty)`);
    }
  }

  console.log("🎉 Migration complete! All your local data is now in MongoDB Atlas.");
  localClient.close();
  atlasClient.close();
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
