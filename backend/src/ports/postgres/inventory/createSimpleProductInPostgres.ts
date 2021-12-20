import {
  CreateSimpleProduct,
  ProductToCreate,
} from "../../../domain/inventory/createSimpleProduct";
import { DuplicateProductInShopError } from "../../../domain/inventory/models/errors/duplicateProductInShopError";
import { SimpleProduct } from "../../../domain/inventory/models/simpleProduct";
import { Postgres } from "../postgres";

class CreateSimpleProductInPostgres implements CreateSimpleProduct {
  constructor(private readonly postgres: Postgres) {}
  async execute(
    { name, quantity, shopId, epc, cabinet }: ProductToCreate,
    overwrite = false
  ): Promise<SimpleProduct> {
    const query = `
      INSERT INTO simple_products (
        epc,
        quantity,
        shop_id,
        name,
        cabinet
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [epc, quantity, shopId, name, cabinet];
    try {
      const created = await this.postgres.sql.query(query, values);
      return new SimpleProduct(
        created.rows[0].id,
        created.rows[0].epc,
        created.rows[0].name,
        created.rows[0].quantity,
        created.rows[0].cabinet,
        created.rows[0].shop_id
      );
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes("simple_products_ean_shop_id_key")
      ) {
        if (!overwrite) {
          throw new DuplicateProductInShopError(epc, shopId);
        }

        const updated = await this.postgres.sql.query(
          `
          UPDATE simple_products
          SET
            quantity = $1,
            name = $2,
            cabinet = $3
          WHERE epc = $4 AND shop_id = $5
          returning *
        `,
          [quantity, name, cabinet, epc, shopId]
        );
        return new SimpleProduct(
          updated.rows[0].id,
          updated.rows[0].epc,
          updated.rows[0].name,
          updated.rows[0].quantity,
          updated.rows[0].cabinet,
          updated.rows[0].shop_id
        );
      }
      throw error;
    }
  }
}

export { CreateSimpleProductInPostgres };
