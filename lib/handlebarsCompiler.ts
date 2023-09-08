/** Dependencies **/
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import { get } from 'lodash';

/** Interfaces **/
import { MailerOptions } from './interfaces/mailer-options.interface';

export class HandlebarsCompiler {
  private precompiledTemplates: {
    [name: string]: handlebars.TemplateDelegate;
  } = {};

  constructor() {
    handlebars.registerHelper('concat', (...args) => {
      args.pop();
      return args.join('');
    });
    handlebars.registerHelper({});
  }

  public compile(
    mail: any,
    callback: any,
    mailerOptions: MailerOptions,
  ): Promise<void> {
    const precompile = (template: any, callback: any, options: any) => {
      const templateBaseDir = get(options, 'dir', '');
      const templateExt = path.extname(template) || '.hbs';
      let templateName = path.basename(template, path.extname(template));
      const templateDir = path.isAbsolute(template)
        ? path.dirname(template)
        : path.join(templateBaseDir, path.dirname(template));
      const templatePath = path.join(templateDir, templateName + templateExt);
      templateName = path
        .relative(templateBaseDir, templatePath)
        .replace(templateExt, '');

      if (!this.precompiledTemplates[templateName]) {
        try {
          const template = fs.readFileSync(templatePath, 'utf-8');

          this.precompiledTemplates[templateName] = handlebars.compile(
            template,
            get(options, 'options', {}),
          );
        } catch (err) {
          return callback(err);
        }
      }

      return {
        templateExt,
        templateName,
        templateDir,
        templatePath,
      };
    };

    const { templateName } = precompile(
      mail.data.template,
      callback,
      mailerOptions.template,
    );

    const runtimeOptions = get(mailerOptions, 'options', {
      partials: false,
      data: {},
    });

    mail.data.html = this.precompiledTemplates[templateName](
      mail.data.context,
      {
        ...runtimeOptions,
        partials: this.precompiledTemplates,
      },
    );

    return callback();
  }
}
