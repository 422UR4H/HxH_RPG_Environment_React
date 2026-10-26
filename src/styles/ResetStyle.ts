import { createGlobalStyle } from "styled-components";
import { colors, fonts } from "./tokens";
import { globalScrollbar, scrollbarPalettes } from "./scrollbar";

const ResetStyle = createGlobalStyle`
	html, body, span, applet, object, iframe,
	h1, h2, h3, h4, h5, h6, p, blockquote, pre,
	a, abbr, acronym, address, big, cite, code,
	del, dfn, em, img, ins, kbd, q, s, samp,
	small, strike, strong, sub, sup, tt, var,
	b, u, i, center,
	dl, dt, dd, ol, ul, li,
	fieldset, form, label, legend,
	table, caption, tbody, tfoot, thead, tr, th, td,
	article, aside, canvas, details, embed, 
	figure, figcaption, footer, header, hgroup, 
	menu, nav, output, ruby, section, summary,
	time, mark, audio, video {
		margin: 0;
		padding: 0;
		border: 0;
		font: inherit;
		vertical-align: baseline;
	}

	html, body {
		/* A ordem importa: a última declaração válida vence. 100vh é o fallback;
		   100dvh acompanha a barra do navegador no celular, senão o documento
		   fica mais alto que a tela e vira um segundo scroller por fora do #root. */
		height: 100vh;
		height: 100dvh;
    background: ${colors.surfaceMuted};
	}

	body {
		font-family: ${fonts.sans};
		line-height: 1;
    position: relative;
	}

	${globalScrollbar(scrollbarPalettes.dark)}

	#root{
		height: 100%;
		overflow-x: hidden;
	}

	article, aside, details, figcaption, figure, 
	footer, header, hgroup, menu, nav, section {
		display: block;
    user-select: none;
	}
	ol, ul {
		list-style: none;
	}
	blockquote, q {
		quotes: none;
	}
	blockquote:before, blockquote:after,
	q:before, q:after {
		content: '';
		content: none;
	}
	table {
		border-collapse: collapse;
		border-spacing: 0;
	}

	button{
		cursor: pointer;
		user-select: none;
	}

	/* Controles não herdam a fonte por padrão. */
	button, input, select, textarea, optgroup {
		font-family: inherit;
	}

	:root {
		--focus-ring: ${colors.actionHighlight};
	}

	/* Anel de foco único. :where zera a especificidade: qualquer regra de componente
	   vence sem depender da ordem de injeção (o styled-components não a garante entre
	   global e componentes). Campos de texto ficam de fora: o navegador marca
	   :focus-visible neles também no clique, e eles têm a borda própria. */
	:where(:not(input, textarea, select)):focus-visible,
	:where(input[type="checkbox"], input[type="radio"], input[type="range"]):focus-visible {
		outline: 2px solid var(--focus-ring);
		outline-offset: 3px;
	}

	* {
		transition: color 200ms, background-color 200ms; 
		box-sizing: border-box;
	}
`;
export default ResetStyle;
