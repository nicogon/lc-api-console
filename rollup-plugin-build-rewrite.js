import path from 'path';
import fs from 'fs-extra';
import { parse } from 'parse5';
import { queryAll, predicates, getAttribute, getTextContent } from '@open-wc/building-utils/dom5-fork/index.js';

class ElementProcessor {
  get index() {
    return path.join(__dirname, 'dist', 'index.html');
  }

  get script() {
    return path.join(__dirname, 'dist', 'apic-import.js');
  }

  async readIndexAst() {
    const content = await fs.readFile(this.index, 'utf8');
    return parse(content);
  }

  async write(content) {
    await fs.writeFile(this.script, content, 'utf8');
  }

  async processBundle() {
    const indexHTML = await this.readIndexAst();
    const scripts = queryAll(indexHTML, predicates.hasTagName('script'));
    const value = this._buildTemplate(scripts);
    await this.write(value);
  }

  _buildTemplate(scripts) {
    let result = this._noModuleScriptLoaderTemplate();
    scripts.forEach((script) => {
      const src = getAttribute(script, 'src');
      if (src) {
        result += `addScript(basePath+'${src}');`;
      } else {
        let content = getTextContent(script);
        content = content.replace(/"(.\/|-|[a-z]|[0-9]|\.)*(.)js"/g, function (x) {
          return `basePath + ${x.replace('./','')}`;
        });
        result += 'try{';
        result += content + '';
        result += '}catch(_){}';
      }
    });
    return result;
  }

  _noModuleScriptLoaderTemplate() {
    return `
    const absoluteUrl = (document.currentScript && document.currentScript.src) || document.getElementsByTagName('script')[document.getElementsByTagName('script').length - 1].src;
    const basePath = absoluteUrl.replace('apic-import.js', '');
    function addScript(src) {
      var s = document.createElement('script');
      s.setAttribute('nomodule', '');
      s.src = src;
      document.body.appendChild(s);
    }
    `;
  }
}

export default function buildRewrite() {
  return {
    name: 'build-rewrite',
    writeBundle() {
      const processor = new ElementProcessor();
      return processor.processBundle();
    }
  };
}
