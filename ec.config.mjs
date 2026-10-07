// @ts-check
import { defineEcConfig } from '@astrojs/starlight/expressive-code';

/**
 * Code blocks as Scalar code cards, dark in both site themes. Colors are the
 * dark values of Scalar's highlight.js rules and match the --scalar-code-*
 * tokens in src/styles/theme.css. With a single theme there is nothing for
 * Starlight's light mode to swap in.
 */
const scalarCode = {
	name: 'scalar-code',
	type: 'dark',
	colors: {
		'editor.background': '#1a1a1a',
		'editor.foreground': '#a4a4a4',
		focusBorder: '#a4a4a4',
		// Title bars: the card's own background, a hairline below, no tab.
		'editorGroupHeader.tabsBackground': '#1a1a1a',
		'editorGroupHeader.tabsBorder': '#2d2d2d',
		'tab.activeBackground': '#0000',
		'tab.activeForeground': '#e7e7e7',
		'titleBar.activeBackground': '#1a1a1a',
		'titleBar.activeForeground': '#e7e7e7',
		'titleBar.border': '#2d2d2d',
	},
	tokenColors: [
		{ scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#797979', fontStyle: 'italic' } },
		{ scope: ['keyword.control', 'keyword.operator.new', 'storage'], settings: { foreground: '#b191f9' } },
		// highlight.js leaves these plain.
		{
			scope: ['storage.type.function.arrow', 'punctuation.separator.key-value', 'entity.name.command', 'string.unquoted.argument'],
			settings: { foreground: '#a4a4a4' },
		},
		{ scope: 'string', settings: { foreground: '#4eb3ec' } },
		{ scope: ['constant.numeric', 'constant.language'], settings: { foreground: '#00b648' } },
		{ scope: 'entity.name.function', settings: { foreground: '#ff8d4d' } },
		// highlight.js `attr`, `attribute` and `variable`: object keys, HTTP header names, shell variables.
		{
			scope: [
				'meta.object-literal.key',
				'support.type.property-name',
				'punctuation.support.type.property-name',
				'entity.name.tag.http',
				'variable.other.normal',
			],
			settings: { foreground: '#e7e7e7' },
		},
	],
};

const httpRequest = /^([A-Z]+) (\/\S*)$/;
const span = (className, value) => ({
	type: 'element',
	tagName: 'span',
	properties: { className: [className] },
	children: [{ type: 'text', value }],
});

/**
 * Scalar's request cards name the request in the header: `POST /path`, the
 * method in green. An untitled `http` block whose first line is a request
 * line gets that line as its title instead of as its first code line.
 * @type {import('@expressive-code/core').ExpressiveCodePlugin}
 */
const pluginHttpRequestTitle = {
	name: 'http-request-title',
	hooks: {
		preprocessCode: ({ codeBlock }) => {
			if (codeBlock.language !== 'http' || codeBlock.props.title) return;
			const line = codeBlock.getLine(0)?.text;
			if (!line || !httpRequest.test(line)) return;
			codeBlock.props.title = line;
			codeBlock.deleteLine(0);
		},
		postprocessRenderedBlock: ({ codeBlock, renderData }) => {
			const request = codeBlock.language === 'http' && codeBlock.props.title?.match(httpRequest);
			if (!request) return;
			const findTitle = (node) =>
				node.properties?.className?.includes('title') ? node : node.children?.map(findTitle).find(Boolean);
			const title = findTitle(renderData.blockAst);
			if (title) title.children = [span('http-method', request[1]), { type: 'text', value: ' ' }, span('http-path', request[2])];
		},
	},
};

export default defineEcConfig({
	themes: [scalarCode],
	plugins: [pluginHttpRequestTitle],
	// Scalar's markdown code blocks have no title bar; without this, an untitled
	// shell block gets an empty terminal bar.
	defaultProps: { frame: 'code' },
	useDarkModeMediaQuery: false,
	// Lifts only the comment grey (#797979 is 4.0:1 on #1a1a1a) to AA. Every other color already clears it.
	minSyntaxHighlightingColorContrast: 4.5,
	styleOverrides: {
		borderRadius: '7.5px', // plus the 0.5px border: Scalar's 8px card
		borderWidth: '0.5px',
		codeFontSize: '14px',
		codeLineHeight: '1.4',
		codePaddingBlock: '12px',
		codePaddingInline: '12px',
		uiFontSize: '14px',
		uiFontWeight: '500',
		uiLineHeight: '22px', // with 6.75px padding: a 36px title bar
		uiPaddingBlock: '6.75px',
		uiPaddingInline: '12px',
		scrollbarThumbColor: '#ffffff1a',
		scrollbarThumbHoverColor: '#ffffff33',
		frames: {
			editorActiveTabIndicatorHeight: '0px',
			frameBoxShadowCssValue: 'none',
			terminalTitlebarDotsOpacity: '0',
		},
	},
});
