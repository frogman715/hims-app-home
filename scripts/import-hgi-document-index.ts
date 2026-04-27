import { importHgiDocumentIndex } from "../src/lib/document-index-import";

async function main() {
  const result = await importHgiDocumentIndex();
  console.log(
    JSON.stringify(
      {
        ok: true,
        source: "docs/hgi-document-audit/output/inventory.json",
        imported: result.imported,
        total: result.total,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  });
