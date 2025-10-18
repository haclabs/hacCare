/**
 * Bulk Operations Utility
 * Provides safe batch processing for bulk database operations
 */

/**
 * Process items in batches to avoid URL length limits and database overload
 */
export async function processBatch<T, R>(
  items: T[], 
  processor: (batch: T[]) => Promise<R>,
  options: {
    batchSize?: number;
    delayBetweenBatches?: number;
    logProgress?: boolean;
  } = {}
): Promise<R[]> {
  const { 
    batchSize = 50, 
    delayBetweenBatches = 100, 
    logProgress = true 
  } = options;

  const results: R[] = [];
  const totalBatches = Math.ceil(items.length / batchSize);

  if (logProgress) {
    console.log(`🔄 Processing ${items.length} items in ${totalBatches} batches of ${batchSize}`);
  }

  for (let i = 0; i < items.length; i += batchSize) {
    const batchNumber = Math.floor(i / batchSize) + 1;
    const batch = items.slice(i, i + batchSize);
    
    try {
      if (logProgress) {
        console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)`);
      }
      
      const result = await processor(batch);
      results.push(result);
      
      if (logProgress) {
        console.log(`✅ Completed batch ${batchNumber}/${totalBatches}`);
      }
      
      // Add delay between batches to avoid overwhelming the database
      if (i + batchSize < items.length && delayBetweenBatches > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    } catch (error) {
      console.error(`❌ Error processing batch ${batchNumber}:`, error);
      throw error;
    }
  }

  if (logProgress) {
    console.log(`🎉 Completed processing ${items.length} items in ${totalBatches} batches`);
  }

  return results;
}

/**
 * Safely delete items in batches using Supabase
 */
export async function batchDelete(
  supabase: any,
  tableName: string,
  ids: string[],
  options: {
    batchSize?: number;
    delayBetweenBatches?: number;
    logProgress?: boolean;
  } = {}
): Promise<{ totalDeleted: number; errors: number }> {
  const { 
    batchSize = 50, 
    delayBetweenBatches = 100, 
    logProgress = true 
  } = options;

  if (ids.length === 0) {
    if (logProgress) {
      console.log('✅ No items to delete');
    }
    return { totalDeleted: 0, errors: 0 };
  }

  if (logProgress) {
    console.log(`🗑️ Deleting ${ids.length} items from ${tableName} in batches...`);
  }

  let totalDeleted = 0;
  let errors = 0;

  await processBatch(
    ids,
    async (batch: string[]) => {
      try {
        const { error, count } = await supabase
          .from(tableName)
          .delete({ count: 'exact' })
          .in('id', batch);

        if (error) {
          console.error(`❌ Error deleting batch from ${tableName}:`, error);
          errors++;
          return 0;
        } else {
          const deleted = count || batch.length;
          totalDeleted += deleted;
          return deleted;
        }
      } catch (batchError) {
        console.error(`❌ Batch deletion error:`, batchError);
        errors++;
        return 0;
      }
    },
    { batchSize, delayBetweenBatches, logProgress }
  );

  if (logProgress) {
    if (errors === 0) {
      console.log(`✅ Successfully deleted ${totalDeleted} items from ${tableName}`);
    } else {
      console.log(`⚠️ Deleted ${totalDeleted} items from ${tableName} with ${errors} batch errors`);
    }
  }

  return { totalDeleted, errors };
}

/**
 * Safely insert items in batches using Supabase
 */
export async function batchInsert<T>(
  supabase: any,
  tableName: string,
  items: T[],
  options: {
    batchSize?: number;
    delayBetweenBatches?: number;
    logProgress?: boolean;
  } = {}
): Promise<{ totalInserted: number; errors: number }> {
  const { 
    batchSize = 50, 
    delayBetweenBatches = 100, 
    logProgress = true 
  } = options;

  if (items.length === 0) {
    if (logProgress) {
      console.log('✅ No items to insert');
    }
    return { totalInserted: 0, errors: 0 };
  }

  if (logProgress) {
    console.log(`➕ Inserting ${items.length} items into ${tableName} in batches...`);
  }

  let totalInserted = 0;
  let errors = 0;

  await processBatch(
    items,
    async (batch: T[]) => {
      try {
        const { error, count } = await supabase
          .from(tableName)
          .insert(batch, { count: 'exact' });

        if (error) {
          console.error(`❌ Error inserting batch into ${tableName}:`, error);
          errors++;
          return 0;
        } else {
          const inserted = count || batch.length;
          totalInserted += inserted;
          return inserted;
        }
      } catch (batchError) {
        console.error(`❌ Batch insertion error:`, batchError);
        errors++;
        return 0;
      }
    },
    { batchSize, delayBetweenBatches, logProgress }
  );

  if (logProgress) {
    if (errors === 0) {
      console.log(`✅ Successfully inserted ${totalInserted} items into ${tableName}`);
    } else {
      console.log(`⚠️ Inserted ${totalInserted} items into ${tableName} with ${errors} batch errors`);
    }
  }

  return { totalInserted, errors };
}