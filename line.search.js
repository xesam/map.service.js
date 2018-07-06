var LineSearcher = (function () {

    function check_response(...items) {
        return items.length >= 2 && items[0] === 'complete' && items[1].info === 'OK';
    }

    function to_location(latlng) {
        return [latlng.getLng(), latlng.getLat()];
    }

    function get_attrs(src, ...attr_names) {
        return attr_names.reduce((total, curr) => {
            total[curr] = src[curr];
            return total;
        }, {});
    }

    function to_line(line_infos) {
        return line_infos.map((line) => {
            return {
                ...get_attrs(line,
                    'id',
                    'name',
                    'type',
                    'start_stop',
                    'end_stop',
                    'stime',
                    'etime',
                    'basic_price',
                    'total_price',
                    'distance',
                    'citycode',
                    'company'
                ),
                path: line.path.map(to_location),
                stops: line.via_stops.map(stop => {
                    return {
                        ...get_attrs(stop, 'id', 'name'),
                        location: to_location(stop.location)
                    }
                }),
            };
        });
    }

    let MAX_PAGE_SIZE = 48;//高德的接口文档说明有错误，这里用来判断是否翻页完毕

    function page_search_by_name(searcher, name, page_index, page_size, total_lines, resolve, reject) {
        searcher.setPageIndex(page_index);
        searcher.setPageSize(page_size);
        searcher.search(name, function (status, result) {
            if (check_response(status, result)) {
                let line_infos = result.lineInfo;
                let search_lines = to_line(line_infos);
                if (search_lines.length < page_size) {
                    total_lines = total_lines.concat(search_lines);
                    resolve(total_lines);
                } else {
                    if (total_lines.length > 0 && search_lines[0].id === total_lines[0].id) {
                        resolve(total_lines);
                    } else {
                        total_lines = total_lines.concat(search_lines);
                        page_search_by_name(searcher, name, page_index + 1, page_size, total_lines, resolve, reject);
                    }
                }
            } else {
                console.error(`error:${name}, ${page_index}, ${page_size}`, status);
                reject(status);
            }
        });
    }

    return {
        init(city_name) {
            this.searcher = new AMap.LineSearch({
                city: city_name,
                extensions: 'all'
            });
            return this;
        },
        search_by_id(id) {
            return new Promise((resolve, reject) => {
                this.searcher.searchById(id, function (status, result) {
                    if (check_response(status, result)) {
                        let line_infos = result.lineInfo;
                        let lines = to_line(line_infos);
                        resolve(lines);
                    } else {
                        console.error(status);
                        reject(status);
                    }
                });
            });
        },
        search_by_name(name) {
            return new Promise((resolve, reject) => {
                page_search_by_name(this.searcher, name, 1, MAX_PAGE_SIZE, [], resolve, reject);
            });
        }
    };
})();