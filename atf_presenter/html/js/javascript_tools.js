function round(number, decimals) {
    return +(Math.round(number + "e+" + decimals) + "e-" + decimals);
}

function getData(folder, files) {
    var list = [];
    for (var x = 0; x < files.length; x++) {
        var filename = files[x];
        list.push($.getJSON(folder + filename + ".json")
            .done(onJSONSuccess(filename))
            .fail(function (jqxhr, textStatus, error) {
                var err = textStatus + ", " + error;
                console.log("Request failed: " + err);
            }));
    }
    $.when.all(list).done(function() {
        showTestList();
    });
}

function onJSONSuccess(filename) {
    return function(data) {
        if (filename.contains("test_list")) {
            data = convertTestList(data);
        }
        if (!writeDataToStorage(filename, data)) {
            console.log("Writing to storage failed!");
        } else {
            console.log("Request suceeded");
        }
    };
}

function convertTestList(test_list) {
    var new_test_list = {};
    $.each(test_list, function(index, values) {
        $.each(values, function(index, values) {
           new_test_list[index] = values;
        });
    });
    return new_test_list;
}

function showTestList() {
    drawTestList();
    $('#test_list_content').show();
}

function drawTestList() {
    var test_list = getDataFromStorage("test_list");
    var test_list_div = $('#test_list_content').find('#test_list');
    test_list_div.empty();

    var number = 1;
    $.each(test_list, function(test_name, test_data) {
        var test_name_full = test_name.split("_");
        var upload_status;
        var table_row_error;
        var button_disabled;

        if (!getDataFromStorage(test_name)) {
            upload_status = '<span class="glyphicon glyphicon-alert" aria-hidden="true"></span><span class="sr-only">Error: </span> File not found!';
            table_row_error = '<tr class="danger">';
            button_disabled = ' disabled="disabled"';
        } else {
            upload_status = '<span class="glyphicon glyphicon-ok" aria-hidden="true"></span><span class="sr-only">No error:</span> No errors!';
            table_row_error = '<tr>';
            button_disabled = '';
        }
        test_list_div.append(table_row_error + '<td><div class="checkbox-inline"><label><input type="checkbox" value="' + test_name + '"' + button_disabled + '></label></div></td><td>' + number + '</td><td>' + test_name + '</td><td>Testsuite ' + test_name_full[0].replace(/^\D+/g, '') + '</td><td>Test ' + test_name_full[1].replace(/^\D+/g, "") + '</td><td class="test_config">' + test_data["test_config"] + '</td><td class="scene_config">' + test_data["scene_config"] + '</td><td class="robot_name">' + test_data["robot"] + '</td><td>' + upload_status + '</td><td><button id="button_detail" type="button" class="btn btn-primary" data-target="#detail_test" data-toggle="modal" data-name="' + test_name + '"' + button_disabled + '>Details</button></td>');

        number++;
    });
}

function drawTestDetails(test_name) {
    var test_detail = $('#detail_test');
    var test_name_split = test_name.split("_");
    test_detail.find('.modal-title').html("Details Testsuite " + test_name_split[0].replace(/^\D+/g, "") + " - Test " + test_name_split[1].replace(/^\D+/g, ""));

    // Get test data
    var test_results = getDataFromStorage(test_name);

    // Get test list
    var test_list = getDataFromStorage("test_list");
    var test_data = {};

    $.each(test_list, function(index, values) {
       if (index === test_name) {
           test_data = values;
       }
    });

    var configuration_div = test_detail.find('#detail_configuration');
    var status_div = test_detail.find('#detail_status');

    var resources_div = test_detail.find('#detail_resources');
    var resources_panel = test_detail.find('#panel_detail_resources');

    var path_length_div = test_detail.find('#detail_path_length');
    var path_length_panel = test_detail.find('#panel_detail_path_length');

    var time_div = test_detail.find('#detail_time');
    var time_panel = test_detail.find('#panel_detail_time');

    resources_panel.hide();
    path_length_panel.hide();
    time_panel.hide();

    var first_entry = true;
    var error = false;

    var plot_tooltip = {
        'formatter': function () {
            var o = this.point.options;

            return '<b>' + this.series.name + '</b><br>' +
                'Average: ' + this.y + '<br>' +
                'Minimum: ' + o.min + '<br>' +
                'Maximum: ' + o.max + '<br>';
        }
    };

    var path_lengths = [];
    var path_lengths_drilldowns = [];
    var times = [];

    configuration_div.empty();
    configuration_div.append('<li><b>Scene config:</b> ' + test_data["scene_config"] + '</li>' +
        '<li><b>Test config:</b> ' + test_data["test_config"] + '</li>' +
        '<li><b>Robot:</b> ' + test_data["robot"] + '</li>' +
        '<li><b>Planer ID:</b> ' + test_data["planer_id"] + '</li>' +
        '<li><b>Planning Method:</b> ' + test_data["planning_method"] + '</li>' +
        '<li><b>Jump threshold:</b> ' + test_data["jump_threshold"] + '</li>' +
        '<li><b>EEF_step:</b> ' + test_data["eef_step"] + '</li>');

    $.each(test_results, function(testblock_name, testblock_metrics) {

        if (testblock_metrics.hasOwnProperty("status") && testblock_metrics["status"] === "error") {
            status_div.empty();
            status_div.append('<div class="alert alert-danger" role="alert">An error occured in testblock "' + testblock_name + '"!</div>');
            error = true;
        } else if (testblock_name === "Error") {
            status_div.empty();
            status_div.append('<div class="alert alert-danger" role="alert">An error occured outside monitored testblocks. Evaluation could not be executed!</div>');
            error = true;
        }

        if (testblock_metrics.hasOwnProperty("resources")) {
            var active_class;
            if (first_entry) {
                resources_div.find('.nav-tabs').empty();
                resources_div.find('.tab-content').empty();
                active_class = "active";
                resources_panel.show();
                first_entry = false;
            } else {
                active_class = "";
            }

            resources_div.find('.nav-tabs').append('<li role="presentation" class="' + active_class + '"><a href="#' + testblock_name + '" aria-controls="' + testblock_name + '" role="tab" data-toggle="tab">' + testblock_name + '</a></li>');
            resources_div.find('.tab-content').append('<div role="tabpanel" class="tab-pane ' + active_class + '" id="' + testblock_name + '"></div>');

            var cpu_nodes = [];
            var mem_nodes = [];
            var io_nodes = [];
            var net_nodes = [];
            $.each(testblock_metrics["resources"], function(node_name, node_resources) {

                if (node_resources.hasOwnProperty("cpu")) {
                    cpu_nodes.push({
                        'name': node_name,
                        'data': [{
                            'x': 0,
                            'y': node_resources["cpu"]["average"],
                            'min': node_resources["cpu"]["min"],
                            'max': node_resources["cpu"]["max"]
                        }]
                    });
                }
                if (node_resources.hasOwnProperty("mem")) {
                    mem_nodes.push({
                        'name': node_name,
                        'data': [{
                            'x': 0,
                            'y': node_resources["mem"]["average"],
                            'min': node_resources["mem"]["min"],
                            'max': node_resources["mem"]["max"]
                        }]
                    });
                }
                if (node_resources.hasOwnProperty("io")) {
                    io_nodes.push({
                        'name': node_name,
                        'data': [{
                            'x': 0,
                            'y': node_resources["io"]["average"][0],
                            'min': node_resources["io"]["min"][0],
                            'max': node_resources["io"]["max"][0]
                        }, {
                            'x': 1,
                            'y': node_resources["io"]["average"][1],
                            'min': node_resources["io"]["min"][1],
                            'max': node_resources["io"]["max"][1]
                        }, {
                            'x': 2,
                            'y': node_resources["io"]["average"][2],
                            'min': node_resources["io"]["min"][2],
                            'max': node_resources["io"]["max"][2]
                        }, {
                            'x': 3,
                            'y': node_resources["io"]["average"][3],
                            'min': node_resources["io"]["min"][3],
                            'max': node_resources["io"]["max"][3]
                        }]
                    });
                }
                if (node_resources.hasOwnProperty("network")) {
                    net_nodes.push({
                        'name': node_name,
                        'data': [{
                            'x': 0,
                            'y': node_resources["network"]["average"][0],
                            'min': node_resources["network"]["min"][0],
                            'max': node_resources["network"]["max"][0]
                        }, {
                            'x': 1,
                            'y': node_resources["network"]["average"][1],
                            'min': node_resources["network"]["min"][1],
                            'max': node_resources["network"]["max"][1]
                        }, {
                            'x': 2,
                            'y': node_resources["network"]["average"][2],
                            'min': node_resources["network"]["min"][2],
                            'max': node_resources["network"]["max"][2]
                        }, {
                            'x': 3,
                            'y': node_resources["network"]["average"][3],
                            'min': node_resources["network"]["min"][3],
                            'max': node_resources["network"]["max"][3]
                        }, {
                            'x': 4,
                            'y': node_resources["network"]["average"][4],
                            'min': node_resources["network"]["min"][4],
                            'max': node_resources["network"]["max"][4]
                        }, {
                            'x': 5,
                            'y': node_resources["network"]["average"][5],
                            'min': node_resources["network"]["min"][5],
                            'max': node_resources["network"]["max"][5]
                        }, {
                            'x': 6,
                            'y': node_resources["network"]["average"][6],
                            'min': node_resources["network"]["min"][6],
                            'max': node_resources["network"]["max"][6]
                        }, {
                            'x': 7,
                            'y': node_resources["network"]["average"][7],
                            'min': node_resources["network"]["min"][7],
                            'max': node_resources["network"]["max"][7]
                        }]
                    });
                }
            });

            if (cpu_nodes.length != 0) {
                resources_div.find('.tab-content #' + testblock_name).append('<div class="plot" id="' + testblock_name + '_res_cpu"></div>');
                $('#' + testblock_name + '_res_cpu').highcharts({
                    chart: {
                        type: 'column',
                        zoomType: 'xy'
                    },
                    title: {
                        text: 'CPU'
                    },
                    yAxis: {
                        title: {
                            text: 'Average consumption [%]'
                        }
                    },
                    xAxis: {
                        labels: {
                            enabled: false
                        }
                    },
                    tooltip: plot_tooltip,
                    series: cpu_nodes
                });
            }

            if (mem_nodes.length != 0) {
                resources_div.find('.tab-content #' + testblock_name).append('<div class="plot" id="' + testblock_name + '_res_mem"></div>');
                $('#' + testblock_name + '_res_mem').highcharts({
                    chart: {
                        type: 'column',
                        zoomType: 'xy'
                    },
                    title: {
                        text: 'Memory'
                    },
                    yAxis: {
                        title: {
                            text: 'Average consumption [%]'
                        }
                    },
                    xAxis: {
                        labels: {
                            enabled: false
                        }
                    },
                    tooltip: plot_tooltip,
                    series: mem_nodes
                });
            }
            if (io_nodes.length != 0) {
                resources_div.find('.tab-content #' + testblock_name).append('<div class="plot" id="' + testblock_name + '_res_io"></div>');
                $('#' + testblock_name + '_res_io').highcharts({
                    chart: {
                        type: 'column',
                        zoomType: 'xy'
                    },
                    title: {
                        text: 'Disk IO operations'
                    },
                    xAxis: {
                        categories: ['Read count', 'Write count', 'Bytes read', 'Bytes wrote']
                    },
                    tooltip: plot_tooltip,
                    series: io_nodes
                });
            }
            if (net_nodes.length != 0) {
                resources_div.find('.tab-content #' + testblock_name).append('<div class="plot" id="' + testblock_name + '_res_network"></div>');
                $('#' + testblock_name + '_res_network').highcharts({
                    chart: {
                        type: 'column',
                        zoomType: 'xy'
                    },
                    title: {
                        text: 'Network traffic'
                    },
                    xAxis: {
                        categories: ['Bytes sent', 'Bytes received', 'Packets sent', 'Packets received', 'Errors received', 'Errors sent', 'Packets dropped: Received', 'Packets dropped: Sent']
                    },
                    tooltip: plot_tooltip,
                    series: net_nodes
                });
            }
        }

        var path_lengths_drilldowns_data = [];
        var path_length_sum = 0;
        if (!(typeof testblock_metrics === 'string' || testblock_metrics instanceof String)) {
            $.each(testblock_metrics, function (metric_name, metric_values) {
                if (metric_name.contains("path_length")) {
                    path_lengths_drilldowns_data.push([metric_name.split("path_length ")[1], metric_values]);
                    path_length_sum += metric_values;
                }
            });
        }
        if (path_lengths_drilldowns_data.length != 0) {
            path_lengths_drilldowns.push({
                'name': testblock_name,
                'id': testblock_name,
                'data': path_lengths_drilldowns_data
            });
            path_lengths.push({
                'name': testblock_name,
                'y': round(path_length_sum, 3),
                'drilldown': testblock_name
            });
        }

        if (testblock_metrics.hasOwnProperty("time")) {
            times.push({
                'name': testblock_name,
                'y': testblock_metrics["time"]
            });
        }
    });

    if (path_lengths.length != 0) {
        path_length_panel.show();
        $(path_length_div).highcharts({
            chart: {
                type: 'column'
            },
            title: {
                text: ''
            },
            subtitle: {
                text: 'Click the columns to view path lengths'
            },
            xAxis: {
                type: 'category'
            },
            yAxis: {
                title: {
                    text: 'Path length'
                }
            },
            legend: {
                enabled: false
            },
            plotOptions: {
                series: {
                    borderWidth: 0,
                    dataLabels: {
                        enabled: true,
                        format: '{point.y}m'
                    }
                }
            },
            tooltip: {
                headerFormat: '<span style="font-size:11px">{series.name}</span><br>',
                pointFormat: '<span style="color:{point.color}">{point.name}</span>: <b>{point.y}m</b> of total<br/>'
            },
            series: [{
                name: "Path lengths",
                colorByPoint: true,
                data: path_lengths
            }],
            drilldown: {
                series: path_lengths_drilldowns
            }
        });
    }
    if (times.length != 0) {
        time_panel.show();
        $(time_div).highcharts({
            chart: {
                plotBackgroundColor: null,
                plotBorderWidth: null,
                plotShadow: false,
                type: 'pie'
            },
            title: {
                text: ''
            },
            tooltip: {
                pointFormat: '{series.name}: <b>{point.y}s</b>'
            },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: {
                        enabled: true,
                        format: '<b>{point.name}</b>: {point.y}s',
                        style: {
                            color: 'black'
                        }
                    }
                }
            },
            series: [{
                name: "Time",
                colorByPoint: true,
                data: times
            }]
        })
    }

    if (!error) {
        status_div.empty();
        status_div.append('<div class="alert alert-success" role="alert">No error during evaluation!</div>');
    }
}

function compareTests(tests) {
    var configuration_div = $('#compare_tests').find('#compare_configuration');
    var test_list = getDataFromStorage("test_list");

    var results_speed = [];
    var results_resources = [];
    var results_efficiency = [];
    var final_results = [];

    var weight_speed = 1;
    var weight_resources = 1;
    var weight_efficiency = 1;

    var temp_time = [];
    var temp_time_total = 0.0;

    var temp_resources = [];
    var temp_resources_total = [];
    temp_resources_total.push(0.0);
    temp_resources_total.push(0.0);
    temp_resources_total.push([0.0, 0.0, 0.0, 0.0]);
    temp_resources_total.push([0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]);

    var temp_path_length = [];
    var temp_path_length_total = 0.0;

    var counter = 0;

    var plot_tooltip = {
        'formatter': function () {
            var o = this.point.options;

            return '<b>' + this.series.name + '</b><br>' +
                'Average: ' + this.y + '<br>' +
                'Minimum: ' + o.min + '<br>' +
                'Maximum: ' + o.max + '<br>';
        }
    };

    configuration_div.empty();
    configuration_div.append('<li><h4><b>General configuration</b></h4></li>' +
        '<li><b>Scene config: </b>' + test_list[tests[0]]["scene_config"] + '</li>' +
        '<li><b>Test config: </b>' + test_list[tests[0]]["test_config"] + '</li>' +
        '<li><h4><b>Test configurations</b></h4></li>');

    $.each(tests, function(index, test_name) {
        var test_data = test_list[test_name];

        configuration_div.append('<li><a data-toggle="collapse" href="#' + test_name + '" aria-expanded="false" aria-controls="' + test_name + '">' +
            '<span class="glyphicon glyphicon-plus-sign" aria-hidden="true"></span><b>&nbsp;' + test_name + '</b></a></li>' +
            '<ul class="collapse" id="' + test_name + '"><div class="well-sm">' +
            '<li><b>Robot:</b> ' + test_data["robot"] + '</li>' +
            '<li><b>Planer ID:</b> ' + test_data["planer_id"] + '</li>' +
            '<li><b>Planning Method:</b> ' + test_data["planning_method"] + '</li>' +
            '<li><b>Jump threshold:</b> ' + test_data["jump_threshold"] + '</li>' +
            '<li><b>EEF_step:</b> ' + test_data["eef_step"] + '</li>' +
            '</div></ul>');

        var test_results = getDataFromStorage(test_name);

        temp_time[counter] = 0.0;
        temp_path_length[counter] = 0.0;

        temp_resources[counter] = [];
        temp_resources[counter].push(0.0);
        temp_resources[counter].push(0.0);
        temp_resources[counter].push([]);
        temp_resources[counter][2].push(0.0);
        temp_resources[counter][2].push(0.0);
        temp_resources[counter][2].push(0.0);
        temp_resources[counter][2].push(0.0);
        temp_resources[counter].push([]);
        temp_resources[counter][3].push(0.0);
        temp_resources[counter][3].push(0.0);
        temp_resources[counter][3].push(0.0);
        temp_resources[counter][3].push(0.0);
        temp_resources[counter][3].push(0.0);
        temp_resources[counter][3].push(0.0);
        temp_resources[counter][3].push(0.0);
        temp_resources[counter][3].push(0.0);

        $.each(test_results, function(index, metrics) {

            if (metrics.hasOwnProperty("time")) {
                temp_time_total += metrics["time"];
                temp_time[counter] += metrics["time"];
            }
            if (metrics.hasOwnProperty("resources")) {
                $.each(metrics["resources"], function(node_name, node_resources) {
                    $.each(node_resources, function(resource_name, resource_data) {

                        if (resource_name === "cpu") {
                            temp_resources[counter][0] += resource_data["average"];
                            temp_resources_total[0] += resource_data["average"];
                        } else if (resource_name === "mem") {
                            temp_resources[counter][1] += resource_data["average"];
                            temp_resources_total[1] += resource_data["average"];
                        } else if (resource_name === "io") {
                            console.log(counter);
                            temp_resources[counter][2][0] += resource_data["average"][0];
                            temp_resources[counter][2][1] += resource_data["average"][1];
                            temp_resources[counter][2][2] += resource_data["average"][2];
                            temp_resources[counter][2][3] += resource_data["average"][3];

                            temp_resources_total[2][0] += resource_data["average"][0];
                            temp_resources_total[2][1] += resource_data["average"][1];
                            temp_resources_total[2][2] += resource_data["average"][2];
                            temp_resources_total[2][3] += resource_data["average"][3];
                        } else if (resource_name === "network") {
                            temp_resources[counter][3][0] += resource_data["average"][0];
                            temp_resources[counter][3][1] += resource_data["average"][1];
                            temp_resources[counter][3][2] += resource_data["average"][2];
                            temp_resources[counter][3][3] += resource_data["average"][3];
                            temp_resources[counter][3][4] += resource_data["average"][4];
                            temp_resources[counter][3][5] += resource_data["average"][5];
                            temp_resources[counter][3][6] += resource_data["average"][6];
                            temp_resources[counter][3][7] += resource_data["average"][7];

                            temp_resources_total[3][0] += resource_data["average"][0];
                            temp_resources_total[3][1] += resource_data["average"][1];
                            temp_resources_total[3][2] += resource_data["average"][2];
                            temp_resources_total[3][3] += resource_data["average"][3];
                            temp_resources_total[3][4] += resource_data["average"][4];
                            temp_resources_total[3][5] += resource_data["average"][5];
                            temp_resources_total[3][6] += resource_data["average"][6];
                            temp_resources_total[3][7] += resource_data["average"][7];
                        }

                        if (typeof resource_data["average"] === "object") {
                            $.each(resource_data["average"], function(index, data) {
                               temp_resources += data;
                            });
                        } else {
                            temp_resources += resource_data["average"];
                        }
                    });
                });
            }
            $.each(metrics, function (metric_name, metric_values) {
                if (metric_name.contains("path_length")) {
                    temp_path_length[counter] += metric_values;
                    temp_path_length_total += metric_values;
                }
            });
        });

        counter++;
    });
    for (var i = 0; i < counter; i++) {
        results_speed.push(temp_time_total/temp_time[i]);
        results_efficiency.push(temp_path_length_total/temp_path_length[i]);
        results_resources.push(
            (temp_resources[i][0]/temp_resources_total[0]) +
            (temp_resources[i][1]/temp_resources_total[1]) +
            (
                (temp_resources[i][2][0]/temp_resources_total[2][0]) +
                (temp_resources[i][2][1]/temp_resources_total[2][1]) +
                (temp_resources[i][2][2]/temp_resources_total[2][2]) +
                (temp_resources[i][2][3]/temp_resources_total[2][3])
            ) +
            (
                (temp_resources[i][3][0]/temp_resources_total[3][0]) +
                (temp_resources[i][3][1]/temp_resources_total[3][1]) +
                (temp_resources[i][3][2]/temp_resources_total[3][2]) +
                (temp_resources[i][3][3]/temp_resources_total[3][3]) +
                (temp_resources[i][3][4]/temp_resources_total[3][4]) +
                (temp_resources[i][3][5]/temp_resources_total[3][5]) +
                (temp_resources[i][3][6]/temp_resources_total[3][6]) +
                (temp_resources[i][3][7]/temp_resources_total[3][7])
            )
        )
    }
    console.log(results_speed);
    console.log(results_efficiency);

    /*
    $('#' + testblock_name + '_res_network').highcharts({
        chart: {
            type: 'column',
            zoomType: 'xy'
        },
        title: {
            text: 'Network traffic'
        },
        xAxis: {
            categories: ['Bytes sent', 'Bytes received', 'Packets sent', 'Packets received', 'Errors received', 'Errors sent', 'Packets dropped: Received', 'Packets dropped: Sent']
        },
        tooltip: plot_tooltip,
        series: net_nodes
    });*/

    $('#button_compare').prop("disabled", true);
}
