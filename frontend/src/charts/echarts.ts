import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, TitleComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

// 树摇：option 里用到的每个组件都必须注册，否则该特性会被静默忽略（不报错）
echarts.use([LineChart, GridComponent, TooltipComponent, TitleComponent, CanvasRenderer])

export { echarts }
