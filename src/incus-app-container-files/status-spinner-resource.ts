import { Spinner } from "https://deno.land/std@0.220.1/cli/spinner.ts";

export type StatusMessages = {
  pending: string;
  done?: string;
};

function calculateMessage(
  name: string,
  statusMessages: StatusMessages,
  currentStatuses: string[] = [],
): string {
  const currently: string[] = currentStatuses.length === 0 ? [] : [
    ` (currently `,
    currentStatuses.join(", "),
    `)`,
  ];
  return [name, ": ", statusMessages.pending, ...currently].join("");
}

/**
 * Spinner that you declare with "using new StatusSpinnerResource()". When it
 * goes out of scope, it will stop spinning, thanks to the {@link Symbol.dispose} method.
 */
export class StatusSpinnerResource {
  static readonly INTERVAL_MS = 1000 / 7;
  private readonly spinner: Spinner;
  constructor(
    private readonly name: string,
    private readonly statusMessages: StatusMessages,
  ) {
    this.spinner = new Spinner({
      message: calculateMessage(name, statusMessages),
      interval: StatusSpinnerResource.INTERVAL_MS,
    });
    if (Deno.stdout.isTerminal()) {
      this.spinner.start();
    }
  }
  [Symbol.dispose](): void {
    this.spinner.stop();
    if (this.statusMessages.done) {
      console.error(`✓ ${this.name}: ${this.statusMessages.done}`);
    }
  }

  /**
   * Setting this property will append " (currently ...)" to the message.
   * @param statuses The current status or statuses to append to the message.
   */
  set currentStatus(statuses: string | string[]) {
    this.spinner.message = calculateMessage(
      this.name,
      this.statusMessages,
      Array.isArray(statuses) ? statuses : [statuses],
    );
  }
}
