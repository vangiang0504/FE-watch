import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-coming-soon-page',
  templateUrl: './coming-soon.page.html',
  styleUrl: './coming-soon.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComingSoonPage {
  private readonly route = inject(ActivatedRoute);

  protected readonly title = toSignal(
    this.route.data.pipe(map((data) => (data['title'] as string) ?? 'Sắp ra mắt')),
    { initialValue: 'Sắp ra mắt' },
  );
}
