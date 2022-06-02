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
      source: d.source || 'other',
      details: [
        {
          status: d.status
        }
      ]
    };
    if (d.prefix) {
      implstatus.prefix = true;
      implstatus.details[0].prefix = true;
    }
    if (d.flag) {
      implstatus.flag = true;
      implstatus.details[0].flag = true;
    }
    if (d.date) {
      implstatus.details[0].date = d.date;
    }
    if (d.comment) {
      implstatus.details[0].notes = [d.comment];
    }
    if (d.href) {
      implstatus.details[0].href = d.href;
    }
    return implstatus;
  });
  return impl;
}