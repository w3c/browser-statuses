/**
 * Parse implementation information manually provided in the data file.
 */

/**
 * Compute a normalized implementation status for the given Webkit Status
 * identifier.
 */
export function getImplementationStatus(impldata) {
  const impl = impldata.map(d => {
    const implstatus = {
      ua: d.ua,
      status: d.status,
      source: d.source || 'other'
    };
    if (d.prefix) {
      implstatus.prefix = true;
    }
    if (d.flag) {
      implstatus.flag = true;
    }
    if (d.date) {
      implstatus.date = d.date;
    }
    if (d.comment) {
      implstatus.notes = [d.comment];
    }
    if (d.href) {
      implstatus.href = d.href;
    }
    return implstatus;
  });
  return impl;
}